CREATE DATABASE IF NOT EXISTS auto_payroll;
USE auto_payroll;

-- =======================
-- 1️⃣ Bảng Roles
-- =======================
CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) UNIQUE NOT NULL,        -- admin, manager, employee
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =======================
-- 2️⃣ Bảng Users
-- =======================
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,           -- tên đăng nhập
  password VARCHAR(255) NOT NULL,                 -- mật khẩu (hash)
  role_id BIGINT NOT NULL,                        -- FK → roles.id
  wallet_address VARCHAR(100) UNIQUE NOT NULL,    -- ví ETH của nhân viên
  private_key VARCHAR(100) NOT NULL,              -- khóa riêng của ví ETH
  image_url VARCHAR(255) DEFAULT NULL,          -- URL ảnh đại diện
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

-- =======================
-- 3️⃣ Bảng Cards
-- =======================
CREATE TABLE cards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  card_uid VARCHAR(50) UNIQUE NOT NULL,            -- UID RFID
  user_id BIGINT NULL,                             -- FK → users.id (có thể null)
  is_active BOOLEAN DEFAULT TRUE,                  -- thẻ còn hiệu lực hay không
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- ngày cấp thẻ
  deactivated_at TIMESTAMP NULL,                   -- ngày thu hồi (nếu có)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL                            -- nếu user bị xóa -> giữ thẻ, user_id = NULL
);

-- =======================
-- 4️⃣ Bảng Access Logs
-- =======================
CREATE TABLE access_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  card_id BIGINT(50) NOT NULL,                 -- UID RFID được quẹt
  user_id BIGINT NOT NULL,                       -- FK → users.id
  access_type TINYINT(1) NOT NULL,               -- 0: entry, 1: exit
  access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TINYINT(1) DEFAULT 1,                   -- 0: denied, 1: success
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);


-- ==========================
-- 🛠️ Thêm dữ liệu mẫu ban đầu
-- ==========================

-- 1️⃣ Thêm vai trò (roles)
INSERT INTO roles (role_name, description)
VALUES 
  ('admin', 'Quản trị hệ thống'),
  ('manager', 'Quản lý nhân sự hoặc bảo vệ'),
  ('employee', 'Nhân viên thông thường');

-- 2️⃣ Thêm tài khoản admin mặc định
-- ⚠️ Mật khẩu nên được hash (ví dụ bằng bcrypt trong NodeJS), 
-- ở đây tạm để plaintext 'admin123' cho demo

INSERT INTO users (username, password, role_id, wallet_address, private_key)
VALUES (
  'admin',
  'admin123',             -- ⚠️ Thay bằng mật khẩu đã mã hóa trong thực tế
  (SELECT id FROM roles WHERE role_name = 'admin'),
  '0x5B3bD1EE972C6a00bd89785901964C8858231B90',  -- địa chỉ ví mặc định hoặc null
  '0x6e1f3255611c765199b9d9f0064a303d108ee47f2761e454f83f0b9f89d864da'   -- khóa riêng mặc định hoặc null
);