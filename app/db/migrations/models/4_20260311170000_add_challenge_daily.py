from aerich.utils import compress_dict, get_models_describe
from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `challenge_daily` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `steps` INT NOT NULL DEFAULT 0,
    `exercise_minutes` INT NOT NULL DEFAULT 0,
    `water_cups` INT NOT NULL DEFAULT 0,
    `sleep_hours` DOUBLE NOT NULL DEFAULT 0,
    `no_snack` BOOL NOT NULL DEFAULT 0,
    `daily_score` DOUBLE NOT NULL DEFAULT 0,
    `tier` VARCHAR(24) NOT NULL DEFAULT 'needs_attention',
    `behavior_index` DOUBLE NOT NULL DEFAULT 0.5,
    `delta` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `user_id` BIGINT NOT NULL,
    CONSTRAINT `fk_challenge_users_0b7fc86b` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uid_challenge_d_user_id_88c7e2` UNIQUE KEY (`user_id`, `date`)
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `challenge_daily`;"""


MODELS_STATE = compress_dict(get_models_describe("models"))
