# Database Overview - YoloHome FaceAI SmartDoor

## 1. Mục đích
Database dùng để:
- lưu cấu hình min/max cho gauge UI
- lưu trạng thái mới nhất của từng feed
- lưu log hệ thống để hiển thị Recent Activity / Alert / Log
- lưu lịch sử lệnh điều khiển
- lưu lịch sử AI nhận diện / mở cửa
- lưu tài khoản đăng nhập, phiên đăng nhập và token reset mật khẩu

## 2. Danh sách bảng

### gauge_config
Lưu cấu hình cho gauge trên UI:
- metric_key: khóa của thông số, ví dụ sensor-temp
- display_name: tên hiển thị trên UI
- min_value: giá trị nhỏ nhất của gauge
- max_value: giá trị lớn nhất của gauge
- unit: đơn vị
- warn_low: ngưỡng cảnh báo thấp
- warn_high: ngưỡng cảnh báo cao

### current_state
Lưu giá trị mới nhất của từng feed:
- feed_key
- value_num
- value_text
- updated_at

Ví dụ:
- sensor-temp = 30.5
- sensor-humid = 67
- sensor-light = 180
- fan-speed = 40
- ai-face-result = Khang

### system_logs
Lưu log tổng hợp của hệ thống:
- AI Unlock
- Low Light
- Light ON
- Fan Speed Updated
- MQTT Reconnected

Các cột:
- id
- timestamp
- event_name
- source
- severity
- log_details

### commands
Lưu lịch sử lệnh điều khiển:
- button-light
- button-door
- fan-speed

Các cột:
- id
- feed_key
- command_value
- source
- status
- created_at
- executed_at

### access_logs
Lưu lịch sử nhận diện khuôn mặt / mở cửa:
- person_name
- result
- confidence
- raw_value
- created_at

### app_users
Lưu tài khoản người dùng cho đăng ký/đăng nhập:
- username
- email
- password_hash (mật khẩu đã mã hóa)
- role (admin hoặc user)
- created_at
- updated_at

### auth_sessions
Lưu phiên đăng nhập:
- user_id
- session_token
- expires_at
- revoked_at

### password_reset_tokens
Lưu token đặt lại mật khẩu:
- user_id
- token_hash
- expires_at
- used_at

## 3. Feed mapping

- sensor-temp -> current_state.value_num
- sensor-humid -> current_state.value_num
- sensor-light -> current_state.value_num
- sensor-motion -> current_state.value_num
- ai-face-result -> current_state.value_text + access_logs
- button-door -> commands + current_state
- button-light -> commands + current_state
- fan-speed -> commands + current_state

## 4. Quy ước dữ liệu

### severity
- info
- warning
- error

### source
- web
- ai
- gateway
- rule-engine
- manual

### result
- success
- denied
- unknown

### status
- success
- failed
- pending
