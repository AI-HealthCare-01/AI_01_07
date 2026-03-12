from aerich.utils import compress_dict, get_models_describe
from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `user_challenge` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `template_key` VARCHAR(64) NOT NULL,
    `title` VARCHAR(64) NOT NULL,
    `description` VARCHAR(160) NOT NULL,
    `is_active` BOOL NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `user_id` BIGINT NOT NULL,
    CONSTRAINT `fk_user_cha_users_713c1019` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uid_user_challe_user_id_1164d9` UNIQUE KEY (`user_id`, `template_key`)
) CHARACTER SET utf8mb4;
        CREATE TABLE IF NOT EXISTS `user_challenge_log` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `done` BOOL NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `user_challenge_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    CONSTRAINT `fk_user_cha_user_cha_9fef41b8` FOREIGN KEY (`user_challenge_id`) REFERENCES `user_challenge` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_user_cha_users_96e7a6b7` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uid_user_challe_user_ch_2336f6` UNIQUE KEY (`user_challenge_id`, `date`)
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `user_challenge_log`;
        DROP TABLE IF EXISTS `user_challenge`;"""


MODELS_STATE = compress_dict(get_models_describe("models"))
