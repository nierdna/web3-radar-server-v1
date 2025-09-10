# SRS — Hệ thống Crawl CryptoRank (Upcoming ICO) → PostgreSQL (Prisma ERD)

## 1) Mục tiêu
Tự động thu thập dữ liệu các dự án **Upcoming ICO** từ CryptoRank và **upsert** vào CSDL theo ERD hiện có (các model: `Web3Project`, `Tokenomic`, `TokenAllocation`, `Fundraising`, `FundingRound`, `TgeInfo`, `CommunityMetrics`, `Socials`, `PreMarketPricing`, `TeamMember`, `Audit`, `RoadmapItem`…).

## 2) Nguồn dữ liệu & phạm vi
- **Danh sách**: `https://cryptorank.io/upcoming-ico`
- **Chi tiết dự án**: các trang `/ico/{project-slug}`
- **Đối tượng**: toàn bộ mục hiển thị trong danh sách tại thời điểm chạy.

## 3) Luồng xử lý

### Bước 1 — Thu danh sách Upcoming ICO
- **Yêu cầu**: HTTP GET (hoặc headless khi anti-bot).
- **Trích xuất** tối thiểu từ list page:
  - `project_name`, `token_symbol` (nếu có), `detail_url`, `chain` (nếu hiển thị), `category/tags` (nếu hiển thị), `status/time window` (Upcoming/TBA…).
- **Kết quả**: mảng `detail_urls[]` đã **deduplicate**.

### Bước 2 — Crawl trang chi tiết từng dự án
- **Trường thông tin cần parse (nếu có)**:
  - **Thông tin chung**: `project_name`, mô tả, `website`, `category/tags`, `chain/network`.
  - **Token/Tokenomics**: `token_name`, `token_symbol`, `token_type`, `total_supply`, `circulating_at_tge`, phân bổ (seed/private/team/treasury/… kèm %), vesting/cliff.
  - **Fundraising**: tổng vốn huy động, danh sách nhà đầu tư nổi bật, các vòng gọi vốn (tên vòng, ngày, số tiền, danh sách investor, giá token).
  - **Launch/TGE**: `tge_date`, `tge_exchange`, `initial_marketcap` (nếu có).
  - **Đội ngũ**: thành viên (tên, vai trò, linkedin, ẩn danh?).
  - **Social**: twitter, discord, telegram, medium, github.
  - **Community metrics**: follower twitter, member discord/telegram, github stars.
  - **Pre-market** (nếu được CryptoRank/nguồn phụ hiển thị): platform, last price, total vol, 24h vol/change.
  - **Audit** (nếu có): tên auditor, link báo cáo, ngày audit.
  - **Roadmap** (nếu có): mốc, thời gian dự kiến, trạng thái.

### Bước 3 — Chuẩn hoá dữ liệu
- **Datetime**: ISO 8601 (UTC).
- **Số tiền/khối lượng**: parse về `Float` (chú ý đơn vị, ký hiệu K/M/B).
- **Chuẩn hoá enum**:
  - `ProjectCategory` ↔ mapping từ tags/sector (Infra/DeFi/NFT/GameFi/DAO/Tool/Layer1/Layer2/Others).
  - `Chain` ↔ network (Solana/Ethereum/… nếu không khớp → `Other`/`Multichain`).
  - `TokenType` (Utility/Governance/… nếu không rõ → `Other`).
  - `LaunchStatus`: mặc định `NotLaunched` cho Upcoming; nếu có testnet/mainnet → set tương ứng.
  - `RoadmapStatus`: map Planned/InProgress/Completed theo ngữ cảnh.
- **Vệ sinh**: trim/normalize whitespace, chuẩn link (bỏ `utm`, unify protocol).

### Bước 4 — Mapping vào ERD (Upsert)

#### 4.1. Web3Project (bảng trung tâm)
- **Create/Upsert điều kiện**:
  - Dò **khóa suy luận**: `name` + `website` hoặc `name` + `symbol`; nếu không chắc, cho phép cấu hình “match by slug” (tạo từ `detail_url`).
- **Gán trường**:
  - `name` ← `project_name`
  - `symbol` ← `token_symbol` (nếu có)
  - `description` ← mô tả dự án (rút gọn ≤ ~1–2k chars)
  - `website` ← `website`
  - `category` ← map → `ProjectCategory`
  - `chain` ← map → `Chain`
  - `launchStatus` ← map → `LaunchStatus`
  - `isPublished` = `false` (crawler không tự public)
  - `isDeleted` = `false`
  - `createdById`/`updatedById` = **system user id** (cấu hình)
- **Quan hệ 1–1/1–n**: tạo sau khi có `project.id`.

#### 4.2. Socials (1–1)
- **Upsert by** `projectId` (unique).
- Map:
  - `twitter`, `discord`, `telegram`, `medium`, `github` ← từ social links.

#### 4.3. CommunityMetrics (1–1)
- **Upsert by** `projectId` (unique).
- Map: `twitterFollowers`, `discordMembers`, `telegramMembers`, `githubStars`.

#### 4.4. Tokenomic (1–1) & TokenAllocation (1–n)
- **Tokenomic** (upsert by `projectId` unique):
  - `tokenName`, `tokenSymbol`, `tokenType` (map `TokenType`)
  - `totalSupply`, `circulatingSupply` (nếu có)
  - `tokenContract` (nếu có)
- **TokenAllocation** (xoá-tạo lại theo `tokenomicId` hoặc upsert theo `name`):
  - `name` (Seed/Private/Public/Team/Treasury/Advisors/Liquidity/Marketing/…)
  - `percent` (Float 0–100)
  - `vestingSchedule`, `cliff` (string, có thể giữ nguyên dạng text từ nguồn)

#### 4.5. Fundraising (1–1) & FundingRound (1–n)
- **Fundraising** (upsert by `projectId`):
  - `totalRaised` (Float, nếu có)
  - `notableInvestors` (String[]) — danh sách nhà đầu tư nổi bật
- **FundingRound** (append/upsert):
  - `roundName` (Seed/Private/Public/Strategic/IEO/IDO/…)
  - `date` (DateTime)
  - `amount` (Float)
  - `investors` (String[])
  - `tokenPrice` (Float?)

#### 4.6. TgeInfo (1–1)
- Upsert by `projectId`:
  - `tgeDate`, `tgeExchange`, `initialMarketcap`.

#### 4.7. PreMarketPricing (1–n)
- Thêm nhiều bản ghi (mỗi **platform** là một record):
  - `platform`, `lastPrice`, `totalVol`, `vol24h`, `change24h`.

#### 4.8. TeamMember (1–n)
- Thêm danh sách:
  - `name`, `role`, `linkedin`, `anonymous` (true nếu ẩn danh).

#### 4.9. Audit (1–n)
- Thêm danh sách:
  - `auditor`, `reportLink`, `auditDate`.

#### 4.10. RoadmapItem (1–n)
- Thêm danh sách:
  - `milestone`, `targetDate`, `status` (map `RoadmapStatus`).

> Lưu ý: Các bảng **Auth** (`User`, `Account`, `Session`, `VerificationToken`, `AuditLog`) giữ nguyên, crawler chỉ cần `createdById/updatedById` là một **User “system”**.

## 5) Chính sách Upsert & Idempotency
- `Web3Project`: tìm trước theo `(name, website)` hoặc `(name, symbol)`. Nếu không trùng → tạo mới.
- Các bảng 1–1: upsert theo `projectId` (unique).
- Các bảng 1–n:
  - Với **TokenAllocation/FundingRound/RoadmapItem/PreMarketPricing/Audit/TeamMember**: 
    - Mặc định **append/upsert theo cặp khoá suy luận**:
      - TokenAllocation: `(tokenomicId, name)`
      - FundingRound: `(fundraisingId, roundName, date)`
      - RoadmapItem: `(projectId, milestone)`
      - PreMarketPricing: `(projectId, platform)`
      - Audit: `(projectId, auditor, auditDate)`
      - TeamMember: `(projectId, name, role)`
    - Cho phép cấu hình chiến lược “replace-all” (xoá và tạo lại) nếu nguồn là authoritative.

## 6) Yêu cầu phi chức năng
- **Chống chặn**: User-Agent rotation, random delay, backoff khi 429/5xx.
- **Hiệu năng**: concurrency 3–5; giới hạn tốc độ theo domain.
- **Giám sát**: log theo URL; thống kê tổng crawl, số project mới/cập nhật, lỗi.
- **An toàn**: sanitize input, chặn XSS trong mô tả HTML (nếu có).
- **Timezone**: chuẩn UTC.
- **Retry**: tối đa 3 lần/URL với exponential backoff.
- **Idempotent**: nhiều lần chạy không tạo trùng lặp logic.

## 7) Mapping chi tiết (tham chiếu nhanh)

| Nguồn CryptoRank | Model. field (Prisma) | Ghi chú |
|---|---|---|
| Project Name | `Web3Project.name` | Bắt buộc |
| Token Symbol | `Web3Project.symbol` & `Tokenomic.tokenSymbol` | Đồng bộ cả 2 |
| Description | `Web3Project.description` | Rút gọn nếu quá dài |
| Website | `Web3Project.website` | Dùng trong matching |
| Sector/Tag | `Web3Project.category` | Map → `ProjectCategory` |
| Chain/Network | `Web3Project.chain` | Map → `Chain` |
| Status (Upcoming/Testnet/…) | `Web3Project.launchStatus` | Map enum |
| Social links | `Socials.*` | 1–1, upsert theo `projectId` |
| Twitter/Discord/TG count | `CommunityMetrics.*` | 1–1 |
| Token Name | `Tokenomic.tokenName` | |
| Token Type | `Tokenomic.tokenType` | Map → `TokenType` |
| Total Supply | `Tokenomic.totalSupply` | Float |
| Circulating at TGE | `Tokenomic.circulatingSupply` | Nếu có |
| Allocation % | `TokenAllocation.{name,percent}` | 1–n |
| Vesting/Cliff | `TokenAllocation.{vestingSchedule,cliff}` | Text |
| Total Raised | `Fundraising.totalRaised` | 1–1 |
| Notable Investors | `Fundraising.notableInvestors[]` | String[] |
| Funding Rounds | `FundingRound.*` | 1–n |
| TGE Date | `TgeInfo.tgeDate` | 1–1 |
| TGE Exchange | `TgeInfo.tgeExchange` | 1–1 |
| Initial MC | `TgeInfo.initialMarketcap` | Float |
| Pre-market (per platform) | `PreMarketPricing.*` | 1–n |
| Team | `TeamMember.*` | 1–n |
| Audit | `Audit.*` | 1–n |
| Roadmap | `RoadmapItem.*` | 1–n |

## 8) Dữ liệu hệ thống & quyền
- **`createdById`, `updatedById`**: thiết lập bằng **User hệ thống** (role `Admin/Editor`) được cấu hình trước.
- **`AuditLog`**: bật hook ghi nhận CRUD (nếu đã có middleware Prisma), không cần crawler thao tác trực tiếp.

## 9) Tiêu chí chấp nhận (Acceptance Criteria)
1. Mỗi dự án trong `upcoming-ico` đều có bản ghi `Web3Project` hợp lệ (ít nhất `name`, `website` hoặc `symbol` nếu có).
2. Các bảng 1–1 (`Socials`, `CommunityMetrics`, `Tokenomic`, `Fundraising`, `TgeInfo`) được **upsert** đúng `projectId`.
3. Các bảng 1–n (`TokenAllocation`, `FundingRound`, `TeamMember`, `Audit`, `RoadmapItem`, `PreMarketPricing`) được thêm/cập nhật theo khoá suy luận nêu ở mục 5, không trùng lặp.
4. Log phiên crawl hiển thị: tổng số project quét, số tạo mới, số cập nhật, số lỗi; tỉ lệ lỗi < 3% URL hợp lệ.
5. Dữ liệu enum (`category`, `chain`, `tokenType`, `launchStatus`, `roadmap.status`) map hợp lệ; nếu không map được → dùng `Others/Other/NotLaunched/Planned` theo ngữ cảnh.

## 10) Gợi ý triển khai kỹ thuật
- **Ngôn ngữ**: Node.js (Puppeteer/Playwright) hoặc Python (Playwright/Requests+BS4).
- **ORM**: Prisma (PostgreSQL) — bám sát schema hiện có.
- **Workflows**:
  - `listCrawl()` → trả `detail_urls[]`
  - `detailCrawl(url)` → trả `normalizedProjectPayload`
  - `upsertProject(payload)` → ghi `Web3Project` + quan hệ con theo thứ tự 1–1 trước, 1–n sau.
- **Cấu hình**:
  - `SYSTEM_USER_ID` cho `createdById/updatedById`
  - Chiến lược **append** hay **replace-all** cho các bảng 1–n.
  - Bật **headless** & **rate limit** theo domain.
