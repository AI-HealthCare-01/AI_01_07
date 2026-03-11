from aerich.utils import compress_dict, get_models_describe
from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `meals` ADD `carb_g` DOUBLE;
        ALTER TABLE `meals` ADD `protein_g` DOUBLE;
        ALTER TABLE `meals` ADD `fat_g` DOUBLE;
    """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE `meals` DROP COLUMN `fat_g`;
        ALTER TABLE `meals` DROP COLUMN `protein_g`;
        ALTER TABLE `meals` DROP COLUMN `carb_g`;
    """


MODELS_STATE = compress_dict(get_models_describe("models"))
