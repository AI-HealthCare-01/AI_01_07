from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from pathlib import Path

import torch
from PIL import Image
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from transformers import AutoImageProcessor, AutoModelForImageClassification

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass(frozen=True)
class Sample:
    path: Path
    label_id: int


class KFoodDataset(Dataset[tuple[Image.Image, int]]):
    def __init__(self, samples: list[Sample], transform: transforms.Compose | None = None):
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[Image.Image, int]:
        sample = self.samples[idx]
        img = Image.open(sample.path).convert("RGB")
        if self.transform is not None:
            img = self.transform(img)
        return img, sample.label_id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Korean food classifier.")
    parser.add_argument(
        "--data-root",
        type=Path,
        default=Path("/Users/admin/Downloads/한국 음식 이미지/kfood"),
    )
    parser.add_argument("--model-name", type=str, default="google/vit-base-patch16-224")
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/food/kfood_model"))
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-5)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--test-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-workers", type=int, default=4)
    parser.add_argument("--max-steps-per-epoch", type=int, default=0)
    parser.add_argument("--max-eval-batches", type=int, default=0)
    parser.add_argument("--early-stopping-patience", type=int, default=3)
    return parser.parse_args()


def discover_menu_dirs(data_root: Path) -> list[Path]:
    menu_dirs: list[Path] = []
    for category_dir in sorted(data_root.iterdir()):
        if not category_dir.is_dir():
            continue
        for menu_dir in sorted(category_dir.iterdir()):
            if not menu_dir.is_dir():
                continue
            has_image = any(file.is_file() and file.suffix.lower() in IMAGE_EXTS for file in menu_dir.iterdir())
            if has_image:
                menu_dirs.append(menu_dir)
    return menu_dirs


def build_class_names(menu_dirs: list[Path]) -> list[str]:
    raw_names = [menu_dir.name for menu_dir in menu_dirs]
    collisions = {name for name in raw_names if raw_names.count(name) > 1}
    class_names: list[str] = []
    for menu_dir in menu_dirs:
        if menu_dir.name in collisions:
            class_names.append(f"{menu_dir.parent.name}_{menu_dir.name}")
        else:
            class_names.append(menu_dir.name)
    return class_names


def split_samples(
    menu_dirs: list[Path],
    class_names: list[str],
    val_ratio: float,
    test_ratio: float,
    seed: int,
) -> tuple[list[Sample], list[Sample], list[Sample], dict[str, int]]:
    rng = random.Random(seed)
    label2id = {label: i for i, label in enumerate(class_names)}

    train_samples: list[Sample] = []
    val_samples: list[Sample] = []
    test_samples: list[Sample] = []
    counts: dict[str, int] = {}

    for menu_dir, label_name in zip(menu_dirs, class_names, strict=True):
        images = [p for p in sorted(menu_dir.iterdir()) if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
        rng.shuffle(images)
        n = len(images)
        n_test = max(1, int(n * test_ratio))
        n_val = max(1, int(n * val_ratio))
        n_train = max(1, n - n_val - n_test)

        if n_train + n_val + n_test > n:
            n_train = n - n_val - n_test
        if n_train <= 0:
            raise ValueError(f"Not enough images in class={label_name}: {n}")

        label_id = label2id[label_name]
        counts[label_name] = n

        train_imgs = images[:n_train]
        val_imgs = images[n_train : n_train + n_val]
        test_imgs = images[n_train + n_val :]

        train_samples.extend(Sample(path=p, label_id=label_id) for p in train_imgs)
        val_samples.extend(Sample(path=p, label_id=label_id) for p in val_imgs)
        test_samples.extend(Sample(path=p, label_id=label_id) for p in test_imgs)

    return train_samples, val_samples, test_samples, counts


def accuracy(
    model: nn.Module,
    loader: DataLoader[tuple[dict[str, torch.Tensor], torch.Tensor]],
    device: torch.device,
    max_batches: int = 0,
) -> float:
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for i, (batch, labels) in enumerate(loader, start=1):
            batch = {k: v.to(device) for k, v in batch.items()}
            labels = labels.to(device)
            logits = model(**batch).logits
            preds = torch.argmax(logits, dim=-1)
            correct += int((preds == labels).sum().item())
            total += int(labels.size(0))
            if max_batches > 0 and i >= max_batches:
                break
    return float(correct / max(total, 1))


def main() -> None:  # noqa: C901
    args = parse_args()
    random.seed(args.seed)
    torch.manual_seed(args.seed)

    if not args.data_root.exists():
        raise FileNotFoundError(f"Data root not found: {args.data_root}")

    menu_dirs = discover_menu_dirs(args.data_root)
    class_names = build_class_names(menu_dirs)
    if not class_names:
        raise RuntimeError("No classes discovered.")

    train_samples, val_samples, test_samples, class_counts = split_samples(
        menu_dirs=menu_dirs,
        class_names=class_names,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        seed=args.seed,
    )

    print(f"classes={len(class_names)} train={len(train_samples)} val={len(val_samples)} test={len(test_samples)}")

    processor = AutoImageProcessor.from_pretrained(args.model_name)
    id2label = {i: label for i, label in enumerate(class_names)}
    label2id = {label: i for i, label in id2label.items()}
    model = AutoModelForImageClassification.from_pretrained(
        args.model_name,
        num_labels=len(class_names),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,
    )

    device = (
        torch.device("cuda")
        if torch.cuda.is_available()
        else torch.device("mps")
        if torch.backends.mps.is_available()
        else torch.device("cpu")
    )
    model.to(device)
    print(f"device={device}")

    def collate_fn(items: list[tuple[Image.Image, int]]) -> tuple[dict[str, torch.Tensor], torch.Tensor]:
        images = [img for img, _ in items]
        labels = torch.tensor([label for _, label in items], dtype=torch.long)
        batch = processor(images=images, return_tensors="pt")
        return batch, labels

    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=12),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        ]
    )

    train_loader = DataLoader(
        KFoodDataset(train_samples, transform=train_transform),
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        collate_fn=collate_fn,
        pin_memory=device.type == "cuda",
    )
    val_loader = DataLoader(
        KFoodDataset(val_samples),
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        collate_fn=collate_fn,
        pin_memory=device.type == "cuda",
    )
    test_loader = DataLoader(
        KFoodDataset(test_samples),
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        collate_fn=collate_fn,
        pin_memory=device.type == "cuda",
    )

    optimizer = AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs, 1))
    best_val_acc = -1.0
    no_improve_epochs = 0
    history: list[dict[str, float]] = []

    train_count_per_label = torch.zeros(len(class_names), dtype=torch.float32)
    for s in train_samples:
        train_count_per_label[s.label_id] += 1
    class_weights = (train_count_per_label.sum() / train_count_per_label.clamp(min=1.0)).to(device)
    class_weights = class_weights / class_weights.mean()
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        seen = 0

        for step, (batch, labels) in enumerate(train_loader, start=1):
            batch = {k: v.to(device) for k, v in batch.items()}
            labels = labels.to(device)

            out = model(**batch)
            loss = criterion(out.logits, labels)
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()

            bs = int(labels.size(0))
            running_loss += float(loss.item()) * bs
            seen += bs
            if step % 100 == 0:
                print(f"epoch={epoch} step={step} loss={loss.item():.4f}")
            if args.max_steps_per_epoch > 0 and step >= args.max_steps_per_epoch:
                print(f"epoch={epoch} reached max_steps_per_epoch={args.max_steps_per_epoch}")
                break

        train_loss = running_loss / max(seen, 1)
        val_acc = accuracy(model, val_loader, device, max_batches=args.max_eval_batches)
        epoch_row = {"epoch": float(epoch), "train_loss": train_loss, "val_acc": val_acc}
        history.append(epoch_row)
        print(f"epoch={epoch} train_loss={train_loss:.4f} val_acc={val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            no_improve_epochs = 0
            args.output_dir.mkdir(parents=True, exist_ok=True)
            model.save_pretrained(args.output_dir)
            processor.save_pretrained(args.output_dir)
            print(f"saved best model to {args.output_dir}")
        else:
            no_improve_epochs += 1

        scheduler.step()
        if no_improve_epochs >= args.early_stopping_patience:
            print(f"early stopping triggered: no improvement for {args.early_stopping_patience} epoch(s)")
            break

    best_model = AutoModelForImageClassification.from_pretrained(args.output_dir)
    best_model.to(device)
    test_acc = accuracy(best_model, test_loader, device, max_batches=args.max_eval_batches)
    print(f"final_test_acc={test_acc:.4f}")

    summary = {
        "model_name": args.model_name,
        "num_classes": len(class_names),
        "train_samples": len(train_samples),
        "val_samples": len(val_samples),
        "test_samples": len(test_samples),
        "best_val_acc": best_val_acc,
        "test_acc": test_acc,
        "history": history,
        "class_counts": class_counts,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "train_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("training complete")


if __name__ == "__main__":
    main()
