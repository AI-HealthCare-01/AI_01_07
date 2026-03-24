from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS `daily_health_checks` (
    `id` BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `record_date` DATE NOT NULL,
    `water_ml` INT NOT NULL DEFAULT 0,
    `steps` INT NOT NULL DEFAULT 0,
    `exercise_minutes` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `user_id` BIGINT NOT NULL,
    UNIQUE KEY `uid_daily_healt_user_id_e1e04e` (`user_id`, `record_date`),
    CONSTRAINT `fk_daily_he_users_9558c252` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS `daily_health_checks`;"""


MODELS_STATE = (
    "eJztmm1z2jgQgP8K40/pTK8DDgGu33jLhWuAm4Rcb5rLeISt2JrIsmvJpUyH/36SbON3B/"
    "dogTRfQljtmt3Ha+1q4ZtiOwbE9F0feki3lPeNbwoBNuT/ZFbeNhTgurFcCBhYYqkKYp0l"
    "ZR7QGZc+AkwhFxmQ6h5yGXIIlxIfYyF0dK6IiBmLfII++1BjjgmZBT2+cP/AxYgY8Cuk0V"
    "v3SXtEEBspV5EhPlvKNbZ2pWxC2KVUFJ+21HQH+zaJld01sxyy1UaECakJCfQAg+LyzPOF"
    "+8K7MM4oosDTWCVwMWFjwEfgY5YId0cGukMEP+4NlQGa4lN+U1vtbrt33mn3uIr0ZCvpbo"
    "Lw4tgDQ0lgtlA2ch0wEGhIjDG3L9CjwqUcvKEFvGJ6CZMMQu54FmEErIphJIghxomzJ4o2"
    "+KphSEwmEly9uKhg9nf/ZnjVvznjWm9ENA5P5iDHZ+GSGqwJsDFI8WjUgBiqnybAVrO5A0"
    "CuVQpQrqUB8k9kMHgG0xD/vJ3PiiEmTDIg7wgP8N5AOnvbwIiyh+PEWkFRRC2ctin9jJPw"
    "zqb9f7Jch9fzgaTgUGZ68iryAgPOWGyZj0+Jh18IlkB/WgHP0HIrjuqU6eaXbNXOSgABpm"
    "QlIhbxhUVkBBBeX0GAmTW0oP5UVGhyOpUlxxDamiXVNV3o0/3Xn3vFp9DTgorhQd3hHPhm"
    "CpWH/1OZBsh8QcXpd1U9P++qzfNO76Ld7V70mtsqlV+qKleDyR+iYqVy+/kSlrwrOdIjLi"
    "3mnDHLABdihmz4Llo/qc1j1F+MM9vrivvuaTau0SYlTZ7Px31BaR66WYqZUQZdWgPYVv+X"
    "pMV99HREoWYj4jNYB1yR6S/JUPegCE4DBX3QKNySSnqhlGXVbib+Oc4dje/JwJgTvA5LVQ"
    "W6xWQ6vl30p3+leiSx74kVVUrXGelZJ9M3bS/S+DhZXDXE28an+WycbaW2eotPivAJ+MzR"
    "iLPSgJGoqpE0ApO6sb5rfOeNTVu+3tiD3tjQ+cR9jbvD3Vu8hNHP2+VOpdXLnVfSsPOkLx"
    "0PIpN8gGtJe8L9BkQvaurCY8ZdeJnjo7yJMiWSxknogdX2cJFMIB4eDwqyYN7Qvx32R7z1"
    "O8wZT4ItONdFwMvPciKgH3B6ez2jHckZDdr8sF5nPrY1OM0JWXuXAVm7fD7Wzo3HLEAt3g"
    "W4gNIVP7fWYVlgeppUW2pvl7mj2iufO4q1NFj5WoNmpH+aCNVdElMtT0w1l5g8YqOoLAuC"
    "Y+LbuaKcohlbH5inMu1fj983xN9/yeU4eBe8Kt/BubMD5mzXGlPuZCEvkccsA6zrDLiSNi"
    "99uuXy6KDGs21ZlorFjLJ2p/lQt1q7bIut8l2xlc03RDXehKEvBTvjwHEwBKSkMUraZWAu"
    "ueGPorltmvada4P5/Dp1Eh1MMs3P7G46GHO8ki5XQizVE6WZGjYq+K71WaSR2U8kWrf7Pg"
    "hSDCjTsGMWQa2eqqQt9zBVCTPwOHbIYxqiRGFXjsde554vYjz2Ovd8oTdWOl/jlwRxApR8"
    "S58pgOFFLj/cQAxY8a+LKn4kcHx3vmySt9n//G3zHxYktSw="
)
