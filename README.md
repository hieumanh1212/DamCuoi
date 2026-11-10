# 💍 Đám Cưới Online

Tiệc cưới ảo nhiều người chơi trên trình duyệt. Cô dâu chú rể tạo sảnh tiệc, trang trí theo ý thích, gửi link mời bạn bè. Khách tạo nhân vật, đi lại trong sảnh, ngồi vào bàn, chat, thả biểu cảm và bỏ phong bì kèm lời chúc vào hòm mừng cưới.

- **Giao diện:** React + Vite + TypeScript, vẽ bằng Canvas 2D. Mọi hình ảnh đều vẽ bằng code, không dùng file ảnh.
- **Server realtime:** Cloudflare Workers + Durable Objects. Trang trí và lời chúc được lưu bền vững.
- **Chi phí:** 0đ (gói Free của Cloudflare + GitHub Pages).

## Tính năng

**Cô dâu & chú rể**
- Tạo đám cưới: điền tên hai người, ngày cưới. Sảnh tiệc mẫu được dựng sẵn, gồm sân khấu, phông chữ Hỷ, 12 bàn tiệc, thảm đỏ, cổng hoa, hòm mừng cưới, sổ lưu bút và khung chụp ảnh.
- **Trang trí:** kéo thả **36 loại đồ** (bàn tròn, sofa, bàn buffet, quầy nước, phông cưới, bánh cưới, tháp ly, piano, chữ LOVE neon, cổng hoa, cột hoa, đèn lồng, nến, gấu bông, thiên nga, đài phun nước, sàn nhảy LED, bảng Welcome, chữ Song Hỷ...), xoay và xóa đồ. Nhiều món **đổi màu được** (14 màu: khăn bàn, đệm ghế, bóng bay, thảm...).
- **9 kiểu sàn** (đá trắng, gỗ, hồng pastel, đỏ truyền thống, sân cỏ, vàng sang trọng, đêm đầy sao, tím oải hương, bãi biển) và 10 màu chủ đạo; sửa tên, ngày cưới, lời chào khách.
- **Nghi lễ:** cắt bánh, nâng ly, trao tình yêu, tung hoa cưới (bó hoa bay tới một khách ngẫu nhiên), bắn pháo giấy. Mọi khách thấy hiệu ứng cùng lúc.
- **Link quản lý** (bí mật) để nửa kia cùng trang trí và tổ chức nghi lễ. Cô dâu chú rể có thể xóa lời chúc không phù hợp.

**Khách mời**
- Nhân vật **chibi có khối** (đầu to, mắt long lanh, tóc bóng). Tự chọn màu da, 6 kiểu tóc, màu tóc, trang phục (sơ mi, áo dài, váy, vest) và màu áo. Cô dâu tự động mặc váy cưới xòe có voan và vương miện, chú rể mặc vest và nơ đỏ.
- Di chuyển bằng **WASD/mũi tên**, hoặc **chạm vào chỗ muốn đến** để nhân vật tự tìm đường. Chạm vào ghế để ngồi.
- Chat có bong bóng hiện trên đầu nhân vật, và 8 biểu cảm. **Khung trò chuyện đóng/mở được**, có đếm tin chưa đọc; trên điện thoại khung chat là ngăn kéo vuốt lên.
- **Mừng cưới:** chọn màu phong bì, viết lời chúc, bỏ vào hòm. Lời chúc được lưu trong **sổ lưu bút**. Game không dùng tiền thật.
- **Chụp ảnh** sảnh tiệc thành file PNG.
- Chơi được trên điện thoại.

## Chạy trên máy

```bash
npm install
npm run dev
```
- Giao diện: http://localhost:5174
- Server: http://localhost:8788

Dùng cổng khác Vẽ Đoán nên có thể chạy song song với Vẽ Đoán.

Kiểm thử:
```bash
npm test            # test luật chơi, bản đồ, tìm đường, phân quyền, lưu lời chúc
npm run typecheck
```

## Đưa lên mạng (miễn phí)

Làm giống như Vẽ Đoán:

1. **Server**
   ```bash
   cd server
   npx wrangler deploy
   ```
   Lệnh này tạo địa chỉ `https://dam-cuoi-server.<tên>.workers.dev`. Nếu máy đã đăng nhập Cloudflare (`wrangler login`) cho Vẽ Đoán thì không cần đăng nhập lại.
2. **GitHub:** tạo repo mới (Public) và `git push`.
3. **Pages:**
   - Vào Settings → Pages → Source, chọn **GitHub Actions**.
   - Vào Settings → Secrets and variables → Actions → **Variables**, thêm biến `VITE_SERVER_URL` = `wss://dam-cuoi-server.<tên>.workers.dev`.
   - Vào tab Actions, chạy workflow **Deploy client lên GitHub Pages**.

## Cấu trúc

```
shared/
  world.ts      bản đồ sảnh, danh mục đồ trang trí, va chạm, tìm đường A*, sảnh mẫu
  look.ts       ngoại hình nhân vật
  protocol.ts   tin nhắn client ↔ server, nghi lễ, biểu cảm, màu sàn
server/src/
  wedding.ts    logic đám cưới (thuần TS, có test)
  index.ts      Worker + Durable Object (mỗi đám cưới 1 object, có lưu trữ)
client/src/
  game/draw.ts  vẽ sàn, tường, sân khấu, đồ trang trí, nhân vật, bong bóng chat
  game/scene.ts engine: vòng lặp, điều khiển, camera, chế độ trang trí, hiệu ứng
  components/   trang chủ, tạo nhân vật, sảnh tiệc, bảng trang trí, hộp thoại
```

## Tùy biến nhanh

| Muốn đổi | Sửa ở đâu |
|---|---|
| Thêm đồ trang trí | `CATALOG` trong `shared/world.ts` + cách vẽ trong `drawItem()` ở `client/src/game/draw.ts` |
| Sảnh mẫu mặc định | `defaultLayout()` trong `shared/world.ts` |
| Kích thước sảnh | `HALL_W`, `HALL_H` trong `shared/world.ts` |
| Kiểu tóc, màu áo | `shared/look.ts` + `drawCharacter()` |
| Thêm nghi lễ | `CEREMONIES` trong `shared/protocol.ts` + hiệu ứng trong `Scene.ceremony()` |
