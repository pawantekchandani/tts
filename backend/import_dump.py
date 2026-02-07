import mysql.connector

def import_dump():
    # Only the essential SQL commands needed for structure and data
    sql_commands = [
        "SET FOREIGN_KEY_CHECKS = 0",
        "DROP TABLE IF EXISTS conversions",
        "DROP TABLE IF EXISTS downloaded_files",
        "DROP TABLE IF EXISTS password_resets",
        "DROP TABLE IF EXISTS users",
        
        """CREATE TABLE `users` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `email` varchar(255) NOT NULL,
          `hashed_password` varchar(255) NOT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `ix_users_email` (`email`),
          KEY `ix_users_id` (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",
        
        """INSERT INTO `users` (`id`, `email`, `hashed_password`) VALUES
        (1, 'write_test@gmail.com', 'test_password'),
        (3, 'admin@test.com', '$2b$12$bKKw3TuEMVpzqBhSFV81nukNmzpLbo2DmUdk24aXvJ9wGrDf/I1M2'),
        (4, 'test5@gmail.com', '$2b$12$Q2n68b9PAkyRADEyfb4DxOahQMRlzi2U6r4FG.BMzsAZ5K5al7ZKm'),
        (5, 'test6@gmail.com', '$2b$12$/THKWbLvP.Q2HMSHTU.E2uNyiZXYDQBbJljDNsg9E9QX/oFb.4aGS'),
        (6, 'test7@gmail.com', '$2b$12$2Vpe9Cpp98bgzHqajNMsce2ernCfBwHnZLssB/vuec6MtPfBigMzm'),
        (7, 'test9@gmail.com', '$2b$12$9Iybazizj.G/p.bum/jKl./BODIEVmv3Dh1Cbbf60toeuLK6PNeJK'),
        (8, 'test8@gmail.com', '$2b$12$H.hf9NEukOtLpg7.vXD/tORxJlDvTenUBggBmwOzG6E3IL5a/nLYq'),
        (9, 'deepak@gmail.com', '$2b$12$wbbMM0lHji8HwCprbvpN4eTKsj7BQF1elxWwxXZ8KYn4XdYzqM5aW'),
        (10, 'test10@gmail.com', '$2b$12$Jj0gGtv9AYwXLPEmeGpLKO/I40/u1pRDeQoIT5acqxbrrIzOfKuVW'),
        (11, 'deepak931127@gmail.com', '$2b$12$LdqgjMbgn8Qw8s.l6mt6BenwQKqU3FAF7u5gAWIpn6daOBNw6sJt6'),
        (12, 'tester@gmail.com', '$2b$12$bdABt.mTWUxHCT.k5uzv8eGOPaPHzF1fEmAgLBV4m2b3kzT0JS3Fa'),
        (13, 'pawan2329@gmail.com', '$2b$12$TYSbtHKVwdJBra0IslFWVu86PDqZEXj1ykzvWWrFnjWbKmyVIu2qi'),
        (14, 'pankaj40476it@gmail.com', '$2b$12$t3hMy4ovNp4nZkgiyUbPoeam/faiBrC2boArJGzLGrG2h1a0ZTLJS'),
        (15, 'Test12@gmail.com', '$2b$12$DWUx0oq3562R.OkiiRr0p.eD0WahCUI9WfQY6V3N/NOFmR5OaPEZy'),
        (16, 'test13@gmail.com', '$2b$12$Wv5IBFpN9zaX0I0VMzB9R.LN/4M9TDzRLDR4zEoimB.Dnwx.Vl7mi'),
        (17, 'test14@gmail.com', '$2b$12$B7ganpGM1Mz1Qbg3KLkygeJkTMqwFXO9QV22eHDlodw4p/Sa/sCfq'),
        (18, 'test15@gmail.com', '$2b$12$T4hvkn4.WI2zdd6Os.O/t.V6IniPLT2zw.geK28Aodgu/vGETcQ6u')""",
        
        """CREATE TABLE `conversions` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `text` varchar(5000) NOT NULL,
          `audio_url` varchar(500) NOT NULL,
          `created_at` datetime DEFAULT NULL,
          `user_id` int(11) DEFAULT NULL,
          `voice_name` varchar(100) DEFAULT 'Joanna',
          PRIMARY KEY (`id`),
          KEY `user_id` (`user_id`),
          KEY `ix_conversions_id` (`id`),
          CONSTRAINT `conversions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",
       
        """CREATE TABLE `downloaded_files` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `filename` varchar(255) NOT NULL,
          `audio_url` varchar(500) NOT NULL,
          `downloaded_at` datetime DEFAULT NULL,
          `user_id` int(11) DEFAULT NULL,
          PRIMARY KEY (`id`),
          KEY `user_id` (`user_id`),
          KEY `ix_downloaded_files_id` (`id`),
          CONSTRAINT `downloaded_files_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

        """INSERT INTO `downloaded_files` (`id`, `filename`, `audio_url`, `downloaded_at`, `user_id`) VALUES
        (1, 'Feb-05_12-41-46.mp3', 'https://tts.testingprojects.online/static/audio/February-2026/Feb-05_07-11-43.mp3', '2026-02-05 07:11:49', 8),
        (2, 'Feb-05_12-44-40.mp3', 'https://tts.testingprojects.online/static/audio/February-2026/Feb-05_07-14-29.mp3', '2026-02-05 07:14:42', 9),
        (3, 'Feb-05_12-50-16.mp3', 'https://tts.testingprojects.online/static/audio/February-2026/Feb-05_07-20-07.mp3', '2026-02-05 07:20:17', 10),
        (4, 'Feb-05_13-57-55.mp3', 'https://tts.testingprojects.online/static/audio/February-2026/Feb-05_08-27-50.mp3', '2026-02-05 08:27:56', 11),
        (5, 'Feb-06_13-29-34.mp3', '/static/audio/February-2026/Feb-06_07-55-59.mp3', '2026-02-06 07:59:37', 17),
        (6, 'Feb-06_18-20-48.mp3', '/static/audio/February-2026/Feb-06_12-50-41.mp3', '2026-02-06 12:50:50', 16)""",
        
        """CREATE TABLE `password_resets` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `email` varchar(255) NOT NULL,
          `token` varchar(255) NOT NULL,
          `expires_at` datetime NOT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `token` (`token`),
          KEY `ix_password_resets_id` (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",
        
        "SET FOREIGN_KEY_CHECKS = 1"
    ]

    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Deepak@123",
            database="tts_local_db"
        )
        cursor = conn.cursor()
        print("Starting Import...")
        
        for sql in sql_commands:
            try:
                cursor.execute(sql)
                conn.commit()
            except Exception as e:
                print(f"Error executing SQL: {e}")
                
        # Insert large data (conversions) separately to handle potential escaping issues
        print("Inserting conversions...")
        insert_conversions = """INSERT INTO `conversions` (`id`, `text`, `audio_url`, `created_at`, `user_id`, `voice_name`) VALUES
        (1, 'hii deepak', '/static/audio/February-2026/Feb-05_06-18-33.mp3', '2026-02-05 06:18:33', 5, 'Joanna'),
        (2, 'from sqlalchemy import Column...', '/static/audio/February-2026/Feb-05_06-19-41.mp3', '2026-02-05 06:19:41', 5, 'Joanna'),
        (3, 'hii deepak how are you', '/static/audio/February-2026/Feb-05_06-33-33.mp3', '2026-02-05 06:33:33', 6, 'Joanna'),
        (4, 'hii deepak this side', '/static/audio/February-2026/Feb-05_06-43-11.mp3', '2026-02-05 06:43:11', 6, 'Joanna'),
        (5, 'hii deeepak', '/static/audio/February-2026/Feb-05_06-47-27.mp3', '2026-02-05 06:47:27', 4, 'Joanna'),
        (6, 'import axios from ...', '/static/audio/February-2026/Feb-05_06-57-07.mp3', '2026-02-05 06:57:07', 8, 'Joanna'),
        (7, 'hii', '/static/audio/February-2026/Feb-05_06-57-39.mp3', '2026-02-05 06:57:39', 7, 'Joanna'),
        (8, 'hii deepak', '/static/audio/February-2026/Feb-05_06-58-11.mp3', '2026-02-05 06:58:11', 8, 'Joanna'),
        (9, 'ye rhi meri main.py file...', '/static/audio/February-2026/Feb-05_07-06-15.mp3', '2026-02-05 07:06:15', 8, 'Joanna'),
        (10, 'test8@gmail.com', '/static/audio/February-2026/Feb-05_07-11-43.mp3', '2026-02-05 07:11:43', 8, 'Joanna'),
        (11, 'hii this side deepak', '/static/audio/February-2026/Feb-05_07-14-29.mp3', '2026-02-05 07:14:29', 9, 'Joanna'),
        (12, 'Hindi Text 1', '/static/audio/February-2026/Feb-05_07-20-07.mp3', '2026-02-05 07:20:07', 10, 'Joanna'),
        (13, 'Hindi Text 2', '/static/audio/February-2026/Feb-05_08-24-48.mp3', '2026-02-05 08:24:48', 11, 'Joanna'),
        (14, 'Hindi Text 3', '/static/audio/February-2026/Feb-05_08-26-27.mp3', '2026-02-05 08:26:27', 11, 'Joanna'),
        (15, 'Hindi Text 4', '/static/audio/February-2026/Feb-05_08-27-02.mp3', '2026-02-05 08:27:02', 11, 'Joanna'),
        (16, 'Hindi Text 5', '/static/audio/February-2026/Feb-05_08-27-50.mp3', '2026-02-05 08:27:50', 11, 'Joanna'),
        (17, 'Poem Text', '/static/audio/February-2026/Feb-05_18-33-46.mp3', '2026-02-05 18:33:46', 14, 'Joanna'),
        (18, 'hello, how are you', '/static/audio/February-2026/Feb-05_18-40-15.mp3', '2026-02-05 18:40:15', 13, 'Joanna'),
        (19, 'hii deepak', '/static/audio/February-2026/Feb-06_05-10-01.mp3', '2026-02-06 05:10:01', 8, 'Joanna'),
        (20, 'hii deepak how are you', '/static/audio/February-2026/Feb-06_05-10-11.mp3', '2026-02-06 05:10:11', 8, 'Joanna'),
        (21, 'hii deepak', '/static/audio/February-2026/Feb-06_06-00-53.mp3', '2026-02-06 06:00:53', 15, 'Kajal'),
        (22, 'hii deepak kaise ho', '/static/audio/February-2026/Feb-06_06-01-03.mp3', '2026-02-06 06:01:03', 15, 'Kajal'),
        (23, 'hii deepak', '/static/audio/February-2026/Feb-06_06-17-36.mp3', '2026-02-06 06:17:36', 16, 'Kajal'),
        (24, 'hii deepak how are you', '/static/audio/February-2026/Feb-06_06-17-51.mp3', '2026-02-06 06:17:51', 16, 'Kajal'),
        (25, 'hii how are you', '/static/audio/February-2026/Feb-06_06-39-16.mp3', '2026-02-06 06:39:16', 16, 'Kajal'),
        (26, 'hii how are you', '/static/audio/February-2026/Feb-06_06-39-35.mp3', '2026-02-06 06:39:35', 16, 'Kajal'),
        (27, 'URL Collision Issue Text', '/static/audio/February-2026/Feb-06_07-35-46.mp3', '2026-02-06 07:35:46', 17, 'Kajal'),
        (28, 'image ko sahi se dekho...', '/static/audio/February-2026/Feb-06_07-36-03.mp3', '2026-02-06 07:36:03', 17, 'Kajal'),
        (29, 'Hindi Text 6', '/static/audio/February-2026/Feb-06_07-55-59.mp3', '2026-02-06 07:55:59', 17, 'Kajal'),
        (30, 'Hindi Text 7', '/static/audio/February-2026/Feb-06_08-34-14.mp3', '2026-02-06 08:34:14', 17, 'Kajal'),
        (31, 'Hindi Text 8', '/static/audio/February-2026/Feb-06_08-59-44.mp3', '2026-02-06 08:59:44', 17, 'Kajal'),
        (32, 'Hindi Text 9', '/static/audio/February-2026/Feb-06_09-26-52.mp3', '2026-02-06 09:26:52', 17, 'Kajal'),
        (33, 'Hindi Text 10', '/static/audio/February-2026/Feb-06_09-29-02.mp3', '2026-02-06 09:29:02', 16, 'Kajal'),
        (34, 'Hindi Text 11', '/static/audio/February-2026/Feb-06_09-37-04.mp3', '2026-02-06 09:37:04', 17, 'Kajal'),
        (35, 'Hindi Text 12', '/static/audio/February-2026/Feb-06_09-38-44.mp3', '2026-02-06 09:38:44', 16, 'Kajal'),
        (36, 'नमस्ते Direct SQL Test', 'test.mp3', '2026-02-06 15:31:05', 16, 'Kajal'),
        (37, 'Hindi Text 13', '/static/audio/February-2026/Feb-06_10-11-54.mp3', '2026-02-06 10:11:54', 17, 'Kajal'),
        (38, 'Hindi Text 14', '/static/audio/February-2026/Feb-06_10-23-38.mp3', '2026-02-06 10:23:38', 17, 'Kajal'),
        (39, 'hiii deepak', '/static/audio/February-2026/Feb-06_11-15-11.mp3', '2026-02-06 11:15:11', 18, 'Kajal'),
        (40, 'Hindi Text 15', '/static/audio/February-2026/Feb-06_11-15-39.mp3', '2026-02-06 11:15:39', 18, 'Kajal'),
        (41, 'hii', '/static/audio/February-2026/Feb-06_12-50-41.mp3', '2026-02-06 12:50:41', 16, 'Kajal'),
        (42, '??????', '/static/audio/February-2026/Feb-06_13-22-30.mp3', '2026-02-06 13:22:30', 16, 'Kajal'),
        (43, '?????? hii deepak this side', '/static/audio/February-2026/Feb-06_13-23-10.mp3', '2026-02-06 13:23:10', 16, 'Kajal'),
        (44, 'deepak this side', '/static/audio/February-2026/Feb-06_13-24-21.mp3', '2026-02-06 13:24:21', 16, 'Kajal'),
        (45, '??????', '/static/audio/February-2026/Feb-07_04-56-22.mp3', '2026-02-07 04:56:22', 16, 'Kajal'),
        (46, '?????? ??????', '/static/audio/February-2026/Feb-07_05-07-17.mp3', '2026-02-07 05:07:17', 16, 'Kajal'),
        (47, '?????? ??????', '/static/audio/February-2026/Feb-07_05-15-51.mp3', '2026-02-07 05:15:51', 17, 'Kajal'),
        (48, 'नमस्ते दुनिया', '/static/audio/February-2026/Feb-07_05-27-24.mp3', '2026-02-07 05:27:24', 17, 'Kajal'),
        (49, 'SQLAlchemy code snippet...', '/static/audio/February-2026/Feb-07_05-30-07.mp3', '2026-02-07 05:30:07', 17, 'Kajal')"""
        
        cursor.execute(insert_conversions)
        conn.commit()
        
        print("Import successfully completed!")
        conn.close()
        
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    import_dump()
