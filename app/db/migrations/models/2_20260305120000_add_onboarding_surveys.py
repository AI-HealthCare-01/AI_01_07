from tortoise import BaseDBAsyncClient
from aerich.utils import compress_dict, get_models_describe

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `onboarding_surveys` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `age` INT NOT NULL,
    `gender` VARCHAR(10) NOT NULL,
    `height_cm` DOUBLE NOT NULL,
    `weight_kg` DOUBLE NOT NULL,
    `bmi` DOUBLE NOT NULL,
    `family_history` VARCHAR(10) NOT NULL,
    `hypertension` BOOL NOT NULL,
    `hyperlipidemia` BOOL NOT NULL,
    `smoking_status` VARCHAR(10) NOT NULL,
    `drinking_freq` VARCHAR(16) NOT NULL,
    `exercise_days_30m` VARCHAR(10) NOT NULL,
    `sugary_drink_freq` VARCHAR(10) NOT NULL,
    `late_night_meal_freq` VARCHAR(10) NOT NULL,
    `post_meal_walk` VARCHAR(10) NOT NULL,
    `risk_group` INT NOT NULL,
    `risk_probability` DOUBLE NOT NULL,
    `risk_stage` VARCHAR(20) NOT NULL,
    `message` VARCHAR(255) NOT NULL,
    `recommended_actions` JSON NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `user_id` BIGINT,
    CONSTRAINT `fk_onboarding_users_6b450391` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `onboarding_surveys`;"""


MODELS_STATE = compress_dict(get_models_describe("models"))
