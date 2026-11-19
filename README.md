# RouteGuard — Station Routing Control Tower

Ứng dụng thử nghiệm chuyển kết quả nghiên cứu định tuyến chặng cuối thành một
bảng điều hành dành cho quản lý vận hành. Hệ thống giúp trả lời ba câu hỏi:

1. Trạm nào cần được kiểm tra trước khi cập nhật mô hình?
2. Nếu dữ liệu lịch sử tại trạm không còn đáng tin, mức ảnh hưởng có thể lớn đến đâu?
3. Hành động tiếp theo là chạy thử, theo dõi hay tiếp tục vận hành hiện tại?

Website đang được triển khai private tại:
<https://station-health-control-tower.luuman1304.chatgpt.site>

## Phạm vi dữ liệu

- 17 trạm và 204 tuyến, mỗi trạm 12 tuyến.
- 5 trạm thuộc nhóm thăm dò và 12 trạm thuộc nhóm xác nhận.
- Dữ liệu đầu vào nhỏ, đã dẫn xuất và kiểm tra được lưu tại `research_inputs/`.
- Snapshot phục vụ website được sinh tại `data/research-snapshot.json`.
- Repository không chứa dữ liệu Amazon thô.

Trạng thái `Cần hành động`, `Cần theo dõi` và `Chưa cần can thiệp` là quy tắc
quyết định prototype. Chúng hỗ trợ ưu tiên kiểm tra, không phải bảo đảm hiệu quả
production hoặc kết luận nhân quả.

## Chức năng

- Tóm tắt điều hành theo ngôn ngữ business.
- Phân nhóm trạm theo mức ưu tiên.
- Danh sách hành động đề xuất cho từng trạm.
- Tìm kiếm và lọc theo trạng thái.
- Drawer chi tiết với phần bằng chứng kỹ thuật có thể mở khi cần.
- API đọc dữ liệu tổng quan, danh sách và chi tiết trạm.
- Giao diện responsive cho desktop và mobile.

## API

| Endpoint | Mô tả |
|---|---|
| `GET /api/v1/overview` | Tổng quan mạng lưới và bằng chứng xác nhận |
| `GET /api/v1/stations` | Danh sách tất cả trạm |
| `GET /api/v1/stations?status=critical` | Lọc trạm cần hành động |
| `GET /api/v1/stations?cohort=pilot` | Lọc theo nhóm nghiên cứu |
| `GET /api/v1/stations/{stationId}` | Chi tiết một trạm; trả 404 nếu không tồn tại |

## Kiến trúc

```text
research_inputs/
    analysis.json
    station_effects.csv
          │
          ▼
scripts/sync-research-snapshot.mjs
          │
          ▼
data/research-snapshot.json
          │
          ├── API routes
          └── Business dashboard
```

Ứng dụng chỉ đọc snapshot. Script đồng bộ không ghi vào các artifact nguồn.

## Chạy cục bộ

Yêu cầu Node.js `>=22.13.0`.

```bash
npm ci
npm run data:sync
npm test
npm run dev
```

Mặc định development server chạy tại `http://127.0.0.1:5173`.

## Kiểm thử và build

```bash
npm run lint
npm test
npm run build
```

Test kiểm tra:

- Đủ 17 trạm và 204 tuyến.
- Giá trị trung bình có trọng số khớp artifact nguồn.
- Bằng chứng xác nhận được sao chép đúng.
- Quy tắc phân nhóm trạng thái xác định và bao phủ toàn bộ trạm.

## Công nghệ

- Next.js/Vinext và React.
- TypeScript.
- Cloudflare Worker runtime.
- API route cùng origin.
- Node.js built-in test runner.

## Lưu ý diễn giải

“Suy giảm” trong ứng dụng là suy giảm chất lượng xếp thứ tự tuyến theo chỉ số
nghiên cứu. Đây không phải phần trăm tăng trực tiếp của chi phí, thời gian giao
hàng hoặc tỷ lệ giao trễ.
