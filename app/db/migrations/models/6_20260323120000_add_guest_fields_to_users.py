from aerich.utils import compress_dict, get_models_describe
from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `users`
        ADD `is_guest` BOOL NOT NULL DEFAULT 0,
        ADD `expires_at` DATETIME(6) NULL;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `users`
        DROP COLUMN `expires_at`,
        DROP COLUMN `is_guest`;"""


MODELS_STATE = compress_dict(get_models_describe("models"))
