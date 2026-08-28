-- One-time local dev setup. Run as root: mysql -u root -p < scripts\setup-local-db.sql
-- Or paste into `mysql -u root -p` interactively.
-- Change the password below to something of your own choosing before running.

CREATE DATABASE IF NOT EXISTS portfolio_dev CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'portfolio_dev'@'localhost' IDENTIFIED BY 'CHANGE_ME_LOCAL_DEV_PASSWORD';
GRANT ALL PRIVILEGES ON portfolio_dev.* TO 'portfolio_dev'@'localhost';
FLUSH PRIVILEGES;
