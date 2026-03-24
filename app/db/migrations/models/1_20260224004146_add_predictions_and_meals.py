from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `diabetes_predictions` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `age_group` VARCHAR(10) NOT NULL,
    `height_cm` DOUBLE NOT NULL,
    `weight_kg` DOUBLE NOT NULL,
    `bmi` DOUBLE NOT NULL,
    `p_prediabetes` DOUBLE NOT NULL,
    `p_diabetes` DOUBLE NOT NULL,
    `risk_level` VARCHAR(20) NOT NULL,
    `top_factors` JSON NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `user_id` BIGINT,
    CONSTRAINT `fk_diabetes_users_1c424620` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) CHARACTER SET utf8mb4;
        CREATE TABLE IF NOT EXISTS `meals` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `label` VARCHAR(80),
    `calories_est` INT,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `user_id` BIGINT,
    CONSTRAINT `fk_meals_users_09075b14` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `meals`;
        DROP TABLE IF EXISTS `diabetes_predictions`;"""


MODELS_STATE = (
    "eJztm21v2zYQgP+K4U8d0BWx4iReMQywE2X16pcgcbahXSHQFi0TkUhVpJIaRf77SOpdoh"
    "QrTeoX6EtjH+8k3qPz3emkfm87xIQ2fdeHHlqs2u9b39sYOJB/yK28bbWB6yZyIWBgbktV"
    "kOjMKfPAgnHpEtgUcpEJ6cJDLkMEcyn2bVsIyYIrImwlIh+jrz40GLEgW0GPL3z+wsUIm/"
    "AbpNFX985YImibma0iU5xbyg22dqVsiNmlVBRnmxsLYvsOTpTdNVsRHGsjzITUghh6gEFx"
    "eOb5Yvtid6GfkUfBThOVYIspGxMugW+zlLsbMlgQLPjx3VDpoCXO8qvW6Z51e8en3R5XkT"
    "uJJWePgXuJ74GhJDCZtR/lOmAg0JAYE2730KNiSwV45yvgqemlTHII+cbzCCNgVQwjQQIx"
    "CZwXouiAb4YNscVEgGsnJxXM/u5fn3/oX7/hWr8IbwgP5iDGJ+GSFqwJsAlI8dOoATFU30"
    "+AnaOjDQByrVKAci0LkJ+RweA3mIX41810ooaYMsmBvMXcwc8mWrC3LRtR9mU3sVZQFF6L"
    "TTuUfrXT8N6M+//muZ6PpgNJgVBmefIo8gADzlikzOVd6scvBHOwuHsAnmkUVohGynSLS4"
    "7m5CUAA0uyEh4L/8IicktlQi8UFymvLC0+16C7VVkGyDqg4vKbph0fn2lHx6e9k+7Z2Unv"
    "KK4yxaWqcjMY/ikqTiY2ny5B0AHIrpM7Y4P9zJ7dTZJntzx3dgupcwXoCpqGCyh9IJ4iXs"
    "tZKkz3k2pH621Sk7ReeU0Sa1mw8m8NmpH+fiLUNglMrTwwtUJgco/NIL0XCerYdyTFId8S"
    "wAtYoJlYb5lne9wf6e9b4t//8KUefAv+tp/B+XQDzKellE/zkOfIYysTrIuYLzgcdaCmbX"
    "JweZ6GDDnwnfiwm2Fbwe+iP9NzfFzuHTR4tM3LQlHNKG+3nz/qTmeTtNgpz4qdfLwhavAm"
    "DN0rMuOAEBsCXNIYpe1yMOfc8LVoxk3TS8faYDodZVr0wTDX/ExuxwOd45V0uRJimZ4oy9"
    "R0kOI+/EmkkdlPJFq3+94KUhtQZtjEUkG9CHOcmmrWsio9ig8bQA4jcDcy5Gw41m9m/fFV"
    "hrPIm2JFk9J1TlooR/FBWv8MZx9a4mvr03Si529CY73Zp7bYE/AZMTB54GGbdjsSR6LsYM"
    "CDAq0BFLOB6guZtXyBC7mNbM59MKfYXodxtCdXNgz5ygvru+YzL2zWsrmwW72wcvM1pkxJ"
    "AJgIzCGD1HA9KGZ1nCBVVMDwKJcfr6ENmHr0HE6TLsIjXsUH3OX0nEiTGEgNyCCwfxDHmB"
    "9ivwC85ghSERyKgaQ6hMrHk2VB3EwrD3JayUPLsDzi13vakzba0/vIzR75VDzxKUwtIbJW"
    "zFg4RZKXNgElAZuxyqFcCrPdhFk1spjeDkZ66+paPx/eDMOnPnE5l4vZe51rvT/KsXwIqN"
    "xZtVhmrBqW0TzNQbUohvoNv2jeFlTCoCrWIlmwbJjGTJ8JtKGpoOkhescr2z2s9dgxa7Wf"
    "VfzlH/Ew4hpL3uYSTxGa5a9u5My29fpG+/elj2XP3pr7yGYI03fihH+0XyV4X+yljmY+dn"
    "BjlGY+dqAXtjDYES80GXVv1FNGT9+t78SM5+fdrxeGj1nWipaJePzWB3+E68IbCOpBWvSW"
    "2s5BLhukcbEHHuIBUTp8uHfcJxh0Rzf6rDW5HfEOaTuvBcoJpWIKF00uy+du8Xi0GbQd5K"
    "CNu1+vP48NntWabyE/Zjrz3iadea+8M+8VX6gGNvEQpAakigaiNFDzZvtVbX7wP0o0XfWB"
    "NV9NV32gF7bpqpuuuumqM1314//RwH2S"
)
