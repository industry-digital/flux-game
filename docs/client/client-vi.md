# Flux Game Client: Tầm Nhìn Giao Diện Văn Học

## Triết Lý Cốt Lõi: Mắt Tâm Hồn Là Ưu Tiên

Client game của chúng tôi tái tưởng tượng giao diện MUD truyền thống như một **trải nghiệm đọc văn học** nơi câu chuyện xuất hiện tự nhiên từ các hệ thống của thế giới. Số liệu phục vụ cho câu chuyện, không bao giờ ngược lại. Chúng tôi thiết kế chủ yếu cho mắt tâm hồn—công cụ hình dung mạnh mẽ nhất từng được tạo ra—trong khi đảm bảo khả năng tiếp cận hoàn toàn cho người chơi khiếm thị.

## Mã Nguồn Mở Theo Thiết Kế

**Minh Bạch Hoàn Toàn**: Phù hợp với nguyên tắc đầu tiên của chúng tôi về niềm tin và minh bạch, cả client game văn học và toàn bộ package `flux-game` đều **hoàn toàn mã nguồn mở** theo giấy phép MIT. Đây không chỉ là về tính mở về mặt kỹ thuật—mà là về việc xây dựng niềm tin thông qua minh bạch và trao quyền cho cộng đồng xây dựng những trải nghiệm game họ muốn.

**Tại Sao Mã Nguồn Mở Quan Trọng**:
- **Niềm Tin Thông Qua Minh Bạch**: Người chơi có thể thấy chính xác cách client của họ hoạt động
- **Đổi Mới Cộng Đồng**: Nhà phát triển có thể học hỏi, cải thiện và mở rộng các triển khai của chúng tôi
- **Ưu Tiên Khả Năng Tiếp Cận**: Mã nguồn mở cho phép các công cụ và cải tiến về khả năng tiếp cận chuyên biệt
- **Phát Triển Giao Thức**: Đóng góp của cộng đồng giúp phát triển hệ thống Facts
- **Đảm Bảo Bảo Mật**: Đánh giá mã công khai đảm bảo các thực hành bảo mật mạnh mẽ

## Nguyên Tắc Thiết Kế

### 1. Trải Nghiệm Đọc Sách Điện Tử
- **Lề rộng** tạo không gian thở và tập trung chú ý vào văn bản
- **Typography serif rõ ràng, có độ đọc cao** sử dụng Zilla Slab cho sự ấm áp và dễ đọc
- **Khoảng cách dòng rộng rãi** (1.6-1.8) cho việc đọc thoải mái
- **Độ dài dòng tối ưu** (45-75 ký tự) ngăn ngừa mỏi mắt
- **Hiệu ứng máy đánh chữ** hiển thị văn bản từ từ, tạo ra sự mong đợi và nhịp điệu

### 2. Khả Năng Tiếp Cận Như Thiết Kế Cốt Lõi
- **Tối ưu hóa trình đọc màn hình** với nhãn ARIA phù hợp và HTML ngữ nghĩa
- **Chế độ tương phản cao** với bảng màu có thể tùy chỉnh
- **Typography có thể mở rộng** từ 12pt đến 32pt mà không làm vỡ layout
- **Điều hướng ưu tiên bàn phím** với các phím tắt trực quan
- **Kể chuyện bằng âm thanh** với tổng hợp giọng nói tự nhiên
- **Nhận dạng lệnh giọng nói** cho tương tác không cần tay
- **Phản hồi xúc giác** cho các thiết bị được hỗ trợ

### 3. Làm Giàu Câu Chuyện
Các lệnh thô của người chơi được chuyển đổi thành văn xuôi văn học thông qua việc làm giàu phía client:

```
Người chơi nhập: say "give me ur ration"
Client hiển thị: Cassius nói, "Tôi đói, Darrow. Cho tôi một ít bánh mì."

Người chơi nhập: n
Client hiển thị: Bạn đi bộ về phía bắc qua những con đường đá cuội,
                 tiếng bước chân của bạn vang vọng trên những bức tường hẹp.

Người chơi nhập: look
Client hiển thị: Chợ trải rộng trước mặt bạn, sống động với
                 tiếng nói chuyện của các thương gia và mùi bánh mì tươi
                 ngọt ngào từ quầy bánh.
```

### 4. Cơ Chế Minh Bạch: Nhật Ký Chiến Đấu
Trong khi trải nghiệm mặc định ưu tiên sự đắm chìm trong câu chuyện, **mọi tính toán đều chính xác về mặt toán học và có thể khám phá được**. Nhật Ký Chiến Đấu cung cấp sự minh bạch hoàn toàn cho những ai muốn hiểu về cơ chế:

**Góc Nhìn Câu Chuyện (Mặc định):**
```
Con goblin vung kiếm điên cuồng về phía bạn, nhưng bạn khéo léo né tránh lưỡi kiếm thô sơ.
Cú phản công của bạn tìm được mục tiêu, và con goblin lảo đảo về phía sau,
ôm lấy vai bị thương.
```

**Nhật Ký Chiến Đấu (Tùy chọn):**
```
═══ NHẬT KÝ CHIẾN ĐẤU ═══
[Lượt 1] Goblin tấn công Người chơi
  • Tấn công Cơ bản: 1d20 + 2 (STR) = 14 + 2 = 16
  • AC Người chơi: 18 (10 + 5 giáp + 2 DEX + 1 né tránh)
  • Kết quả: TRƯỢT (16 < 18)

[Lượt 1] Phản công Người chơi được kích hoạt (trượt ≤2)
  • Tấn công Phản công: 1d20 + 4 (DEX) + 2 (vũ khí) = 11 + 4 + 2 = 17
  • AC Goblin: 15 (10 + 3 da + 2 DEX)
  • Kết quả: TRÚNG (17 ≥ 15)
  • Sát thương: 1d6 + 2 (STR) = 4 + 2 = 6 xuyên thủng
  • Vị trí: Vai phải (lăn 73/100)
  • HP Goblin: 22 → 16
═══════════════════
```

**Tính Năng Chính:**
- **Ẩn theo mặc định** để duy trì sự đắm chìm trong câu chuyện
- **Có thể bật/tắt** qua phím tắt (`Ctrl+M`) hoặc lệnh giọng nói
- **Chi tiết hồi tố** - xem cơ chế cho bất kỳ hành động nào trong quá khứ
- **Độ chính xác toán học** với mọi lần tung xúc xắc, modifier và tính toán được hiển thị
- **Định dạng tiếp cận được** với tiêu đề rõ ràng và dữ liệu có cấu trúc
- **Giá trị giáo dục** giúp người chơi hiểu về các hệ thống cơ bản

## Bố Cục Giao Diện: Hai Trải Nghiệm Khác Biệt

### Chế Độ Sách Điện Tử: Đắm Chìm Văn Học

**Tính Năng Chế Độ Sách Điện Tử:**
- **Cột văn bản trung tâm** với lề 4-6em ở mỗi bên
- **Thanh trạng thái tinh tế** ở dưới cùng với thông tin cần thiết
- **Chỉ báo con trỏ** (▊) hiển thị vị trí nhập
- **Tiết lộ văn bản từ từ** với hiệu ứng máy đánh chữ
- **Cuộn mượt mà** để duy trì luồng đọc
- **Typography văn học** với font serif Zilla Slab
- **Câu chuyện đắm chìm** với việc làm giàu phía client

### Chế Độ Tương Thích Terminal: Trải Nghiệm MUD Cổ Điển

**Tính Năng Chế Độ Tương Thích Terminal:**

**Tùy Chọn Font Đơn Cách** với định dạng truyền thống:
- **Consolas**: Font lập trình của Microsoft với khả năng đọc xuất sắc
- **SF Mono**: Font đơn cách hệ thống của Apple cho macOS
- **Cascadia Code**: Font terminal hiện đại của Microsoft với ligatures
- **Mặc định Hệ thống**: Tôn trọng cài đặt font terminal của người dùng
- **Kích thước có thể tùy chỉnh**: 10-16pt với rendering pixel-perfect

**Hiển Thị Văn Bản Ngay Lập Tức** không có độ trễ animation:
- **Độ trễ bằng không**: Văn bản xuất hiện ngay lập tức cho hiệu quả tối đa
- **Không có hiệu ứng máy đánh chữ**: Loại bỏ tất cả độ trễ animation
- **Rendering hàng loạt**: Các khối văn bản lớn xuất hiện ngay lập tức
- **Buffer cuộn ngược**: Xử lý hiệu quả lượng lớn văn bản

**Mật Độ Thông Tin Gọn Gàng** với trang trí thị giác tối thiểu:
- **Văn bản tối đa trên màn hình**: Tối ưu hóa cho thông lượng thông tin
- **Lề tối thiểu**: Sử dụng toàn bộ chiều rộng terminal
- **Định dạng dày đặc**: Bố cục kiểu MUD truyền thống
- **Đầu ra có cấu trúc**: Phân tách rõ ràng giữa các yếu tố game

**Điều Hướng Bàn Phím Hoàn Toàn** với hỗ trợ phím tắt rộng rãi:
- **Phím tắt MUD cổ điển**: Hoàn thành tab, lịch sử lệnh (↑/↓)
- **Lệnh người dùng chuyên nghiệp**: Ctrl+R (lặp lại), Ctrl+L (xóa), Ctrl+U (xóa dòng)
- **Quản lý cửa sổ**: Alt+Tab (chuyển cửa sổ), Ctrl+PageUp/Down (cuộn)
- **Phím tắt khả năng tiếp cận**: Tất cả chức năng đều có thể tiếp cận bằng bàn phím

**Nhập Lệnh Thô** không có chỉnh sửa phía client:
- **Truyền lệnh trực tiếp**: Không làm giàu hay chỉnh sửa
- **Aliases và triggers**: Tự động hóa do người dùng định nghĩa mà không có cải tiến bắt buộc
- **Lịch sử lệnh**: Gọi lại thông minh với khớp mờ
- **Hoàn thành tab**: Đề xuất hoàn thành do server cung cấp

**Định Dạng MUD Truyền Thống** với chỉ báo trạng thái quen thuộc:
- **Thanh trạng thái**: HP/MP/Vị trí theo định dạng quen thuộc
- **Tùy chỉnh prompt**: Kiểu prompt do người dùng định nghĩa
- **Hỗ trợ màu sắc**: Màu ANSI và theme terminal
- **Tương thích**: Hoạt động với ký ức cơ bắp MUD hiện có

**Lệnh Modal Kiểu Vim** (tính năng tùy chọn):
- **Mô hình chỉnh sửa modal**: Chuyển đổi giữa chế độ lệnh và chèn
- **Chế độ thường**: Điều hướng lịch sử, thực thi lệnh, quản lý buffer
- **Chế độ chèn**: Nhập văn bản tiêu chuẩn cho lệnh và chat
- **Chế độ lệnh**: Thực thi meta-commands (`:alias`, `:trigger`, `:settings`)
- **Chế độ visual**: Chọn và thao tác khối văn bản
- **Phím tắt quen thuộc**: Điều hướng `hjkl`, `dd` xóa dòng, `yy` sao chép
- **Quản lý buffer**: Nhiều buffer lệnh với `:b1`, `:b2`, v.v.
- **Tìm kiếm và thay thế**: Tìm kiếm `/pattern`, thay thế `:%s/old/new/g`
- **Ghi macro**: `q` để ghi, `@` để phát lại chuỗi lệnh
- **Chia cửa sổ**: `:split` ngang, `:vsplit` dọc
- **Quản lý tab**: `:tabnew`, `:tabnext` cho nhiều session

**Lợi Ích Chế Độ Vim Cho Người Dùng Chuyên Nghiệp**:
```typescript
// Ví dụ lệnh kiểu Vim trong chế độ terminal
Chế độ thường:
  k/j           - Điều hướng lịch sử lệnh lên/xuống
  dd            - Xóa dòng lệnh hiện tại
  yy            - Sao chép lệnh hiện tại vào clipboard
  /pattern      - Tìm kiếm lịch sử lệnh
  :alias gn go north  - Tạo alias
  :trigger "You are hungry" "eat bread"  - Tạo trigger

Chế độ chèn:
  i             - Vào chế độ chèn để nhập lệnh
  ESC           - Quay lại chế độ thường

Chế độ lệnh:
  :w            - Lưu session hiện tại
  :q            - Thoát một cách trang nhã
  :settings     - Mở bảng cài đặt
  :plugins      - Quản lý plugins
  :help vim     - Tham khảo phím tắt Vim
```

**Kích Hoạt Tùy Chọn**:
- **Tắt theo mặc định**: Duy trì trải nghiệm MUD quen thuộc
- **Chuyển đổi dễ dàng**: `:set vim` để bật, `:set novim` để tắt
- **Cài đặt theo profile**: Có thể bật trong các profile người dùng cụ thể
- **Đường cong học tập**: Giới thiệu nhẹ nhàng với gợi ý hữu ích
- **Chế độ dự phòng**: Luôn quay về chỉnh sửa tiêu chuẩn khi cần

### Chuyển Đổi Chế Độ

**Chuyển Đổi Liền Mạch**: Người chơi có thể chuyển đổi giữa các chế độ ngay lập tức:
- **Phím tắt**: `Ctrl+Alt+M` chuyển đổi giữa các chế độ
- **Lệnh giọng nói**: "Chuyển sang chế độ terminal" hoặc "Chuyển sang chế độ sách điện tử"
- **Menu cài đặt**: Tùy chọn lâu dài với tùy chỉnh theo chế độ
- **Nhận biết ngữ cảnh**: Một số người chơi thích sách điện tử để khám phá, terminal để chiến đấu

**Chức Năng Chia Sẻ**: Cả hai chế độ đều sử dụng cùng hệ thống Facts cơ bản:
- **Dữ liệu game giống nhau**: Truy cập giống nhau vào thông tin thế giới
- **Kết nối XMPP giống nhau**: Không cần kết nối lại
- **Tính năng tiếp cận giống nhau**: Trình đọc màn hình hoạt động ở cả hai chế độ
- **Xử lý lệnh giống nhau**: Tất cả lệnh có sẵn ở cả hai giao diện

### So Sánh Chế Độ

| Tính Năng | Chế Độ Sách Điện Tử | Chế Độ Tương Thích Terminal |
|-----------|---------------------|----------------------------|
| **Đối Tượng Mục Tiêu** | Người chơi mới, tập trung câu chuyện | Người chơi MUD kỳ cựu, tập trung hiệu quả |
| **Typography** | Zilla Slab serif, 16-18pt | Tùy chọn đơn cách, 12-14pt |
| **Layout** | Cột trung tâm, lề rộng | Toàn chiều rộng, lề tối thiểu |
| **Hiển Thị Văn Bản** | Hiệu ứng máy đánh chữ, có nhịp độ | Hiển thị ngay lập tức, độ trễ bằng không |
| **Nhập Lệnh** | Làm giàu ("say hello" → văn xuôi văn học) | Nhập thô ("say hello" → "You say, 'hello'") |
| **Phong Cách Thị Giác** | Giấy ấm, giống sách | Terminal, tương phản cao |
| **Mật Độ Thông Tin** | Có không khí, mô tả | Gọn gàng, có cấu trúc |
| **Điều Hướng Bàn Phím** | Phím tắt tập trung đọc | Phím tắt MUD rộng rãi + chế độ Vim tùy chọn |
| **Độ Trễ Animation** | Hiệu ứng máy đánh chữ tùy chọn | Không có, hiển thị ngay lập tức |
| **Chỉnh Sửa Modal** | Không áp dụng | Lệnh modal kiểu Vim tùy chọn |
| **Khả Năng Tiếp Cận** | Tập trung đọc, đắm chìm | Tập trung hiệu quả, có cấu trúc |

### Tốt Nhất Của Cả Hai Thế Giới

**Trải Nghiệm Thống Nhất**: Cùng một hệ thống Facts cung cấp cho cả hai chế độ, đảm bảo:
- **Trạng thái game nhất quán** trên tất cả giao diện
- **Chơi công bằng** - không có lợi thế cho chế độ nào
- **Thiết kế tiếp cận được** - cả hai chế độ đều hỗ trợ trình đọc màn hình
- **Lựa chọn người chơi** - chuyển đổi dựa trên tâm trạng, ngữ cảnh hoặc sở thích

**Triển Khai Kỹ Thuật**: Chuyển đổi chế độ hoàn toàn ở phía client:
```typescript
// Xử lý Facts đơn, nhiều chế độ trình bày
interface PresentationMode {
  renderFacts(facts: Fact[]): string;
  getInputStyle(): InputStyle;
  getTypography(): Typography;
}

const ebookMode: PresentationMode = {
  renderFacts: (facts) => enrichedNarrativeRenderer(facts),
  getInputStyle: () => ({ typewriter: true, enrichment: true }),
  getTypography: () => ({ font: 'Zilla Slab', size: '18px' })
};

const terminalMode: PresentationMode = {
  renderFacts: (facts) => traditionalMudRenderer(facts),
  getInputStyle: () => ({ typewriter: false, enrichment: false }),
  getTypography: () => ({ font: 'monospace', size: '14px' })
};
```

## Typography và Thiết Kế Thị Giác

### Phân Cấp Font
- **Văn bản chính**: Zilla Slab Regular, 16-18pt
- **Hành động người chơi**: Zilla Slab Medium, 16-18pt, màu phân biệt
- **Tin nhắn hệ thống**: Zilla Slab Light, 14-16pt, tắt tiếng
- **Nhấn mạnh**: Zilla Slab SemiBold cho thông tin quan trọng

### Bảng Màu (Ưu Tiên Khả Năng Tiếp Cận)
```css
/* Theme Mặc định: Giấy Ấm */
--bg-primary: #faf8f5;        /* Trắng giấy ấm */
--text-primary: #2d2d2d;      /* Than chì đậm */
--text-secondary: #666666;    /* Xám trung bình */
--accent: #8b4513;            /* Nâu ấm */
--player-action: #1a472a;     /* Xanh rừng sâu */

/* Theme Tương Phản Cao */
--bg-primary: #000000;        /* Đen thuần */
--text-primary: #ffffff;      /* Trắng thuần */
--text-secondary: #cccccc;    /* Xám nhạt */
--accent: #ffff00;            /* Vàng sáng */
--player-action: #00ff00;     /* Xanh lá sáng */

/* Theme Tối */
--bg-primary: #1a1a1a;        /* Xám sâu */
--text-primary: #e8e8e8;      /* Trắng ấm */
--text-secondary: #b0b0b0;    /* Xám trung bình */
--accent: #d4a574;            /* Vàng ấm */
--player-action: #7fb069;     /* Xanh sage */
```

## Tính Năng Khả Năng Tiếp Cận

### Hỗ Trợ Trình Đọc Màn Hình
- **Cấu trúc HTML ngữ nghĩa** với tiêu đề và landmark thích hợp
- **Vùng live** cho cập nhật nội dung động
- **Văn bản thay thế mô tả** cho tất cả yếu tố thị giác
- **Liên kết bỏ qua điều hướng** để duyệt hiệu quả
- **Tối ưu hóa thứ tự đọc** cho luồng logic

### Khả Năng Tiếp Cận Thị Giác
- **Tuân thủ WCAG AAA** cho tỷ lệ tương phản màu sắc
- **UI có thể mở rộng** hoạt động từ văn bản 12pt đến 32pt
- **Chuyển đổi chế độ tương phản cao**
- **Tùy chọn giảm chuyển động** cho người dùng có rối loạn tiền đình
- **Chỉ báo tiêu điểm** có thể nhìn thấy rõ ràng

### Tính Năng Âm Thanh
- **Tổng hợp giọng nói tự nhiên** cho text-to-speech
- **Tín hiệu âm thanh** cho các loại nội dung khác nhau:
  - Chuông nhẹ cho tin nhắn mới
  - Âm thanh phân biệt cho hành động người chơi
  - Âm thanh môi trường cho sự đắm chìm không khí
- **Điều khiển tốc độ đọc** (0.5x đến 2x)
- **Lựa chọn giọng nói** với các giọng kể khác nhau

### Phương Thức Nhập
- **Phím tắt** cho tất cả chức năng:
  - `Tab` / `Shift+Tab`: Điều hướng các yếu tố
  - `Ctrl+L`: Tập trung dòng lệnh
  - `Ctrl+R`: Lặp lại lệnh cuối
  - `Ctrl+H`: Truy cập trợ giúp
  - `Ctrl+S`: Chuyển đổi giọng nói
  - `Ctrl+Plus/Minus`: Điều chỉnh kích thước font
- **Lệnh giọng nói** để chơi không cần tay
- **Hỗ trợ điều hướng switch** cho thiết bị hỗ trợ

## Triển Khai Kỹ Thuật

### Tauri + React 19: Nền Tảng Hoàn Hảo

**Ứng Dụng Desktop Độc Lập**: Client game văn học của chúng tôi được xây dựng như một **ứng dụng Tauri** kết hợp frontend React 19 với backend Rust - mang lại trải nghiệm desktop native với công nghệ web.

**Cực Kỳ Nhẹ**: Kích thước tải xuống khoảng **10MB** - nhỏ hơn hầu hết các ứng dụng mobile, nhưng mạnh mẽ hơn các client dựa trên trình duyệt.

**Tại Sao Tauri + React 19?**
- **Hiệu Suất Native**: Backend Rust cung cấp khả năng cấp hệ thống
- **UI Hiện Đại**: React 19 với tính năng concurrent cho animation mượt mà
- **Đa Nền Tảng**: Codebase đơn chạy trên Windows, macOS và Linux
- **Bảo Mật Theo Mặc Định**: Mô hình bảo mật của Tauri ngăn chặn nhiều lỗ hổng web
- **Tích Hợp Hệ Thống**: Tích hợp OS sâu mà client web đơn giản không thể đạt được

### Khả Năng Backend Rust: Điều Mà Các MMO Khác Không Thể Làm

**Xử Lý Âm Thanh Cấp Hệ Thống**:
```rust
// Xử lý âm thanh thời gian thực cho soundscape đắm chìm
use cpal::traits::StreamTrait;

pub fn create_spatial_audio_stream(facts: &[Fact]) -> Result<Stream, AudioError> {
    // Xử lý dữ liệu khí quyển thành âm thanh 3D có vị trí
    // Áp dụng filter thời gian thực dựa trên môi trường
    // Trộn nhiều nguồn âm thanh với tăng tốc phần cứng
}
```

**Tính Năng Khả Năng Tiếp Cận Nâng Cao**:
```rust
// Tích hợp trình đọc màn hình native
use windows::Win32::UI::Accessibility::*;

pub fn register_accessibility_hooks() {
    // Tích hợp trực tiếp với Windows Narrator, macOS VoiceOver
    // Giọng nói TTS tùy chỉnh với cảm xúc
    // Rendering văn bản tăng tốc phần cứng cho chế độ tương phản cao
}
```

**Caching Thông Minh và Hỗ Trợ Offline**:
```rust
// Cache trạng thái thế giới cục bộ dựa trên SQLite
use sqlx::sqlite::SqlitePool;

pub async fn cache_world_state(facts: &[Fact]) -> Result<(), CacheError> {
    // Cache thông minh trạng thái thế giới để xem lại offline
    // Pre-load dự đoán nội dung có khả năng
    // Cập nhật hiệu quả dựa trên diff để tối thiểu hóa bandwidth
}
```

**Tích Hợp Phần Cứng**:
```rust
// Truy cập phần cứng trực tiếp cho phản hồi đắm chìm
use gilrs::{Gilrs, GamepadId};

pub fn initialize_haptic_feedback() -> Result<HapticController, HardwareError> {
    // Rung game controller cho phản hồi chiến đấu
    // Pattern xúc giác tùy chỉnh cho các sự kiện khác nhau
    // Tích hợp với phần cứng khả năng tiếp cận chuyên biệt
}
```

### Khả Năng Mà Client Web Đơn Giản Không Thể Sánh Được

**🔊 Xử Lý Âm Thanh Thời Gian Thực**
- **Âm Thanh Không Gian**: Âm thanh 3D có vị trí dựa trên tọa độ thế giới
- **Trộn Động**: Filter âm thanh thời gian thực dựa trên môi trường (echo trong hang, tắt tiếng dưới nước)
- **Tổng Hợp Giọng Nói Tùy Chỉnh**: Cảm xúc trong TTS dựa trên tâm trạng nhân vật
- **Tăng Tốc Phần Cứng**: API âm thanh native cho xử lý không độ trễ

**♿ Khả Năng Tiếp Cận Nâng Cao**
- **Tích Hợp Trình Đọc Màn Hình Native**: Truy cập API trực tiếp vào Windows Narrator, macOS VoiceOver
- **Hook Bàn Phím Cấp Hệ Thống**: Phím tắt toàn cục hoạt động ngay cả khi ứng dụng không được tập trung
- **Hỗ Trợ Thiết Bị Phần Cứng**: Tích hợp trực tiếp với phần cứng khả năng tiếp cận chuyên biệt
- **Rendering Văn Bản Hiệu Suất Cao**: Mở rộng văn bản tăng tốc GPU mà không mất chất lượng

**💾 Lưu Trữ Cục Bộ Thông Minh**
- **Tích Hợp SQLite**: Cache hiệu quả trạng thái thế giới và lịch sử lệnh
- **Pre-load Dự Đoán**: Dự đoán nội dung có khả năng dựa trên pattern người chơi
- **Chế Độ Offline**: Xem lại session quá khứ và chuẩn bị lệnh khi ngắt kết nối
- **Lưu Trữ Mã Hóa**: Lưu trữ cục bộ an toàn dữ liệu game nhạy cảm

**🎮 Tích Hợp Hệ Thống**
- **Hỗ Trợ Game Controller**: Tích hợp gamepad native với phản hồi xúc giác tùy chỉnh
- **Thông Báo OS**: Thông báo cấp hệ thống cho các sự kiện game quan trọng
- **Truy Cập File System**: Import/export log game, screenshot và cấu hình
- **Quản Lý Nguồn**: Tối ưu hóa pin thông minh cho game trên laptop

**⚡ Lợi Thế Hiệu Suất**
- **Multithreading Native**: Concurrency không sợ hãi của Rust cho cập nhật UI mượt mà
- **Parsing Không Sao Chép**: Xử lý hiệu quả các batch Facts lớn
- **Tăng Tốc GPU**: Rendering văn bản và hiệu ứng tăng tốc phần cứng
- **An Toàn Bộ Nhớ**: Rust ngăn chặn crash làm phiền các client native khác

### Engine Làm Giàu Phía Client
```typescript
interface EnrichmentEngine {
  // Chuyển đổi lệnh thô thành văn xuôi văn học
  enrichCommand(raw: string, context: GameContext): string;

  // Thêm chi tiết không khí dựa trên trạng thái thế giới
  addAtmosphere(location: Location, weather: Weather, time: Time): string;

  // Chuyển đổi tin nhắn hệ thống thành ngôn ngữ tự nhiên
  humanizeSystem(message: SystemMessage): string;

  // Duy trì tính nhất quán câu chuyện
  maintainVoice(text: string, character: Character): string;
}
```

### Hiệu Ứng Máy Đánh Chữ Nâng Cao
- **Rendering Tăng Tốc Phần Cứng**: Animation mượt mà ngay cả với khối văn bản lớn
- **Tốc Độ Có Thể Cấu Hình** (10-100 WPM) với điều khiển timing theo từng ký tự
- **Tạm Dừng Thông Minh**: Nhịp điệu tự nhiên dựa trên dấu chấm câu và cấu trúc câu
- **Tích Hợp Khả Năng Tiếp Cận**: Đồng bộ hóa trình đọc màn hình liền mạch
- **Đồng Bộ Âm Thanh**: Phối hợp với TTS cho timing hoàn hảo

### Quản Lý Trạng Thái Nâng Cao
- **Cài Đặt Lâu Dài**: Lưu trữ cục bộ được mã hóa cho tùy chọn khả năng tiếp cận
- **Lịch Sử Lệnh Thông Minh**: Lịch sử dựa trên SQLite với tìm kiếm toàn văn
- **Khôi Phục Session**: Tiếp tục game bị gián đoạn với ngữ cảnh hoàn chỉnh
- **Chế Độ Offline**: Xem lại session quá khứ và chuẩn bị lệnh khi ngắt kết nối
- **Cache Dự Đoán**: Pre-load nội dung có khả năng dựa trên pattern người chơi

## Tính Năng Nâng Cao: Aliases, Triggers và Hệ Thống Plugin

### Hỗ Trợ Alias và Trigger Hoàn Chỉnh

**Tính Năng Cho Người Đam Mê MUD Hardcore**: Chúng tôi cung cấp hỗ trợ đầy đủ cho các tính năng power-user làm cho các client như Mudlet trở nên phổ biến, được triển khai với type safety hiện đại và hiệu suất.

**Aliases**: Chuyển đổi phím tắt đơn giản thành lệnh phức tạp
```typescript
// Thay thế văn bản đơn giản
addAlias("gn", "go north");
addAlias("k", "kill");

// Thay thế biến
addAlias("k %1", "kill $1");
addAlias("tell %1 %2", "tell $1 $2");

// Alias nhiều dòng với scripting
addAlias("heal", `
  if (health < 50) {
    cast('heal');
    drink('health potion');
  }
`);
```

**Triggers**: Phản ứng tự động với các sự kiện game cụ thể
```typescript
// Trigger pattern văn bản
addTrigger("^You are hungry", "eat bread");
addTrigger("^(.+) enters the room", "say Welcome, $1!");

// Trigger dựa trên Fact (tận dụng dữ liệu phong phú của chúng tôi)
addTrigger((fact) => {
  if (fact.kind === 'event' && fact.subject?.type === 'COMBAT_ATTACK') {
    if (fact.subject.target === myActor.id) {
      return "dodge"; // Tự động né tránh khi bị tấn công
    }
  }
});

// Trigger có điều kiện phức tạp
addTrigger((facts) => {
  const combatFacts = facts.filter(f => f.kind === 'event' && f.subject?.type?.includes('COMBAT'));
  if (combatFacts.length > 0) {
    enableCombatMode();
    return "wield sword";
  }
});
```

**Tính Năng Trigger Nâng Cao**:
- **Hỗ trợ Regex**: Khớp pattern biểu thức chính quy đầy đủ
- **Trigger dựa trên Fact**: Phản ứng với các sự kiện game có cấu trúc, không chỉ văn bản
- **Logic có điều kiện**: Các tình huống if/then/else phức tạp
- **Giới hạn tốc độ**: Ngăn chặn spam bằng timer cooldown
- **Hệ thống ưu tiên**: Kiểm soát thứ tự thực thi trigger
- **Quản lý trạng thái**: Duy trì biến cụ thể cho trigger

### Hệ Thống Plugin Client Type-Safe

**Kiến Trúc Plugin Hiện Đại**: Không như các client MUD truyền thống, hệ thống plugin của chúng tôi được xây dựng với TypeScript để có type safety hoàn chỉnh và hỗ trợ IDE.

```typescript
// Interface plugin với type safety hoàn chỉnh
interface FluxPlugin {
  name: string;
  version: string;
  author: string;

  // Lifecycle hooks
  onInitialize?(context: PluginContext): void;
  onFactsReceived?(facts: Fact[], context: PluginContext): void;
  onCommandSent?(command: string, context: PluginContext): string | void;
  onModeChanged?(mode: 'ebook' | 'terminal', context: PluginContext): void;

  // Mở rộng UI
  renderUI?(container: HTMLElement): void;

  // Trigger và alias tùy chỉnh
  triggers?: TriggerDefinition[];
  aliases?: AliasDefinition[];
}

// Context plugin với truy cập API phong phú
interface PluginContext {
  // Truy cập trạng thái game
  getWorldState(): WorldState;
  getPlayerState(): PlayerState;

  // Thực thi lệnh
  sendCommand(command: string): void;

  // Thao tác UI
  displayMessage(message: string, style?: MessageStyle): void;
  createNotification(text: string, type: 'info' | 'warning' | 'error'): void;

  // Lưu trữ
  getPluginData<T>(key: string): T | undefined;
  setPluginData<T>(key: string, value: T): void;

  // Hệ thống sự kiện
  on<T>(event: string, handler: (data: T) => void): void;
  emit<T>(event: string, data: T): void;
}
```

**Ví Dụ Plugin**:

```typescript
// Plugin Hỗ Trợ Chiến Đấu
const CombatAssistant: FluxPlugin = {
  name: "Hỗ Trợ Chiến Đấu",
  version: "1.0.0",
  author: "Cộng Đồng",

  onFactsReceived(facts, context) {
    const combatFacts = facts.filter(f =>
      f.kind === 'event' && f.subject?.type?.includes('COMBAT')
    );

    if (combatFacts.length > 0) {
      this.analyzeCombat(combatFacts, context);
    }
  },

  analyzeCombat(facts, context) {
    // Tự động chữa lành khi máu thấp
    const healthFact = facts.find(f => f.subject?.health);
    if (healthFact?.subject?.health < 30) {
      context.sendCommand('cast heal');
    }
  }
};

// Plugin Bản Đồ
const AutoMapper: FluxPlugin = {
  name: "Bản Đồ Tự Động",
  version: "1.0.0",
  author: "Cộng Đồng",

  onFactsReceived(facts, context) {
    const movementFacts = facts.filter(f =>
      f.kind === 'event' && f.subject?.type === 'ACTOR_DID_MOVE'
    );

    movementFacts.forEach(fact => {
      this.updateMap(fact.subject, context);
    });
  },

  renderUI(container) {
    // Render widget bản đồ tương tác
    const mapDiv = document.createElement('div');
    mapDiv.className = 'minimap';
    container.appendChild(mapDiv);
  }
};
```

**Phân Phối Plugin**:
- **Trình Quản Lý Plugin Tích Hợp**: Cài đặt/gỡ cài đặt với UI đơn giản
- **Kho Cộng Đồng**: Chia sẻ plugin với người chơi khác
- **Quản Lý Phiên Bản**: Cập nhật tự động và giải quyết dependency
- **Sandboxing Bảo Mật**: Plugin chạy trong context cách ly
- **Giám Sát Hiệu Suất**: Theo dõi việc sử dụng tài nguyên plugin

### Tính Năng Tùy Chọn và Tùy Chỉnh

**Trải Nghiệm Hoàn Toàn Có Thể Cấu Hình**: Mọi cải tiến đều tùy chọn và có thể điều chỉnh theo sở thích người chơi.

#### Hiệu Ứng Văn Bản Máy Đánh Chữ
```typescript
interface TypewriterSettings {
  enabled: boolean;           // Mặc định: true ở chế độ e-book, false ở terminal
  speed: number;              // 10-100 WPM, mặc định: 60
  pauseOnPunctuation: boolean; // Mặc định: true
  skipOnScroll: boolean;      // Mặc định: true
  audioCues: boolean;         // Mặc định: false
}
```

**Tùy Chỉnh Máy Đánh Chữ**:
- **Điều Khiển Tốc Độ**: Từ 10 WPM (kịch tính) đến 100 WPM (hiệu quả)
- **Tạm Dừng Dấu Chấm**: Nhịp điệu tự nhiên hoặc tốc độ nhất quán
- **Trigger Bỏ Qua**: Cuộn, nhấp chuột hoặc nhấn phím để bỏ qua animation
- **Đồng Bộ Âm Thanh**: Phối hợp với TTS cho timing hoàn hảo
- **Ghi Đè Khả Năng Tiếp Cận**: Tự động tắt cho trình đọc màn hình

#### Làm Giàu Đầu Vào qua LLM
```typescript
interface EnrichmentSettings {
  enabled: boolean;           // Mặc định: false (opt-in)
  model: 'gpt-4' | 'claude' | 'local'; // Mặc định: 'local'
  creativityLevel: number;    // 0-100, mặc định: 50
  preserveIntent: boolean;    // Mặc định: true
  contextWindow: number;      // Số dòng ngữ cảnh, mặc định: 10
}
```

**Tính Năng Làm Giàu Đầu Vào**:
- **Hoàn Toàn Tùy Chọn**: Tắt theo mặc định, opt-in rõ ràng
- **Bảo Tồn Ý Định**: Không bao giờ thay đổi ý nghĩa của lệnh
- **Nhận Biết Ngữ Cảnh**: Sử dụng cuộc trò chuyện gần đây để làm giàu tốt hơn
- **Đa Mô Hình**: Hỗ trợ các nhà cung cấp AI khác nhau hoặc mô hình cục bộ
- **Điều Khiển Sáng Tạo**: Điều chỉnh giữa hiệu quả và phong cách văn học

**Ví Dụ Làm Giàu**:
```typescript
// Không làm giàu (mặc định)
Đầu vào: "say hello"
Đầu ra: "You say, 'hello'"

// Có làm giàu (tùy chọn)
Đầu vào: "say hello"
Ngữ cảnh: [Cuộc trò chuyện trước về việc mệt mỏi sau chuyến đi dài]
Đầu ra: "Bạn nở một nụ cười mệt mỏi nhưng chân thành. 'Xin chào,' bạn nói,
         giọng nói của bạn mang theo sự mệt mỏi từ những chuyến đi gần đây."
```

### Cấu Hình và Tùy Chọn

**Điều Khiển Chi Tiết**: Mọi tính năng có thể được cấu hình độc lập:

```typescript
interface ClientPreferences {
  // Cài đặt chế độ
  defaultMode: 'ebook' | 'terminal';

  // Trình bày văn bản
  typewriter: TypewriterSettings;
  enrichment: EnrichmentSettings;

  // Khả năng tiếp cận
  accessibility: AccessibilitySettings;

  // Tính năng nâng cao
  aliases: AliasDefinition[];
  triggers: TriggerDefinition[];
  plugins: PluginConfiguration[];

  // Nhật ký chiến đấu
  combatLog: CombatLogSettings;
}
```

**Hệ Thống Profile**: Lưu các cấu hình khác nhau cho các phong cách chơi khác nhau:
- **Profile Đắm Chìm**: Chế độ e-book, máy đánh chữ đầy đủ, làm giàu tùy chọn
- **Profile Hiệu Quả**: Chế độ terminal, animation tối thiểu, alias rộng rãi
- **Profile Người Dùng Chuyên Nghiệp**: Chế độ terminal với lệnh Vim, trigger nâng cao, mở rộng plugin
- **Profile Tiếp Cận**: Tối ưu hóa cho trình đọc màn hình và công nghệ hỗ trợ
- **Profile Chiến Đấu**: Trigger được kích hoạt, nhật ký chiến đấu hiển thị, phản ứng nhanh

## Chiến Lược Nội Dung

### Giọng Điệu Câu Chuyện
- **Góc nhìn ngôi thứ ba nhất quán** duy trì sự đắm chìm
- **Chi tiết cảm quan phong phú** thu hút nhiều giác quan
- **Cộng hưởng cảm xúc** trong tương tác nhân vật
- **Kể chuyện môi trường** thông qua mô tả không khí

### Kiến Trúc Thông Tin
- **Thông tin cần thiết** vẫn dễ tiếp cận
- **Tiết lộ từ từ** ngăn chặn quá tải nhận thức
- **Trợ giúp theo ngữ cảnh** cung cấp hỗ trợ khi cần
- **Suy thoái trang nhã** đảm bảo chức năng cốt lõi hoạt động ở mọi nơi

## Luồng Trải Nghiệm Người Dùng

### Người Chơi Lần Đầu
1. **Thiết lập tùy chọn khả năng tiếp cận** trong quá trình hướng dẫn
2. **Tích hợp hướng dẫn** với ngữ cảnh câu chuyện
3. **Giới thiệu nhẹ nhàng** các tính năng làm giàu
4. **Hướng dẫn tùy chỉnh** cho trải nghiệm tối ưu

### Người Chơi Quay Lại
1. **Khôi phục session liền mạch** với nhắc nhở ngữ cảnh
2. **Đồng bộ tùy chọn** trên các thiết bị
3. **Cải tiến từ từ** các tính năng mới
4. **Mẫu tương tác quen thuộc** duy trì ký ức cơ bắp

## Chỉ Số Thành Công

### Chỉ Số Khả Năng Tiếp Cận
- **Điểm số kiểm tra tương thích trình đọc màn hình**
- **Đo lường hiệu quả điều hướng bàn phím**
- **Tỷ lệ áp dụng tùy chọn người dùng**
- **Điểm số hài lòng phản hồi khả năng tiếp cận**

### Chỉ Số Tương Tác
- **Thời lượng session** và độ sâu tương tác
- **Tỷ lệ văn bản trên hành động** đo lường độ phong phú câu chuyện
- **Giữ chân người chơi** trên các nhu cầu khả năng tiếp cận khác nhau
- **Phản hồi cộng đồng** về chất lượng đắm chìm

## Phát Triển Client Tùy Chỉnh: Hệ Sinh Thái Mở

### Giao Thức Phổ Quát Cho Phép Đổi Mới Người Chơi

Một trong những khía cạnh mạnh mẽ nhất của hệ thống Facts của chúng tôi là nó tạo ra một **giao thức phổ quát** cho phép người chơi xây dựng client game tùy chỉnh của riêng họ. Kiến trúc được thiết kế để hoàn toàn mở và có thể mở rộng trong khi duy trì tính bảo mật và nhất quán của câu chuyện.
