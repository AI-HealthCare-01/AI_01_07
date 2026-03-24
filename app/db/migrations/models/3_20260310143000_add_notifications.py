from aerich.utils import compress_dict, get_models_describe
from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `notifications` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `type` VARCHAR(64) NOT NULL,
    `level` VARCHAR(16) NOT NULL DEFAULT 'info',
    `icon` VARCHAR(16),
    `title` VARCHAR(120) NOT NULL,
    `body` VARCHAR(255) NOT NULL,
    `is_read` BOOL NOT NULL DEFAULT 0,
    `read_at` DATETIME(6),
    `scheduled_for` DATETIME(6),
    `sent_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `dedupe_key` VARCHAR(190) NOT NULL UNIQUE,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `user_id` BIGINT NOT NULL,
    CONSTRAINT `fk_notifications_users_4f2d00aa` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`, `created_at`);
CREATE INDEX `idx_notifications_user_isread` ON `notifications` (`user_id`, `is_read`);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `notifications`;"""


MODELS_STATE = compress_dict(get_models_describe("models"))
