"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Eye,
  FileSearch,
  Gauge,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Status = "stable" | "watch" | "critical";
type Station = {
  id: string;
  routes: number;
  cohort: "pilot" | "confirmation";
  knownStationScore: number;
  coldStartScore: number;
  gap: number;
  relativeGap: number;
  status: Status;
};
type OverviewResponse = {
  generatedAt: string;
  provenance: { mode: string; note: string };
  overview: {
    routes: number;
    stations: number;
    relativeDegradation: number;
    degradedStations: number;
    statusCounts: Record<Status, number>;
  };
  confirmation: {
    relativeDegradation: number;
    deltaCi95: number[];
    degradedStations: number;
    stations: number;
  };
};

const statusText: Record<Status, string> = {
  stable: "Chưa cần can thiệp",
  watch: "Cần theo dõi",
  critical: "Cần hành động",
};

const formatScore = (value: number) => value.toFixed(5);
const formatPercent = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

const impactLevel = (station: Station) => {
  if (station.status === "stable") return "Không đáng kể";
  if (station.relativeGap >= 0.5) return "Rất cao";
  if (station.status === "critical") return "Cao";
  return station.relativeGap >= 0.2 ? "Trung bình" : "Thấp";
};

const recommendation = (status: Status) => {
  if (status === "critical")
    return "Kiểm tra dữ liệu lịch sử và chạy thử trước khi đổi mô hình";
  if (status === "watch") return "Theo dõi trong kỳ đánh giá tiếp theo";
  return "Tiếp tục vận hành theo quy trình hiện tại";
};

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: Status | "neutral";
}) {
  return (
    <article className={`summary-card ${tone}`}>
      <div className="summary-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

export function Dashboard() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [status, setStatus] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Station | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResponse, stationsResponse] = await Promise.all([
        fetch("/api/v1/overview", { cache: "no-store" }),
        fetch("/api/v1/stations", { cache: "no-store" }),
      ]);
      if (!overviewResponse.ok || !stationsResponse.ok)
        throw new Error("Không thể đọc dữ liệu đánh giá");
      setOverview(await overviewResponse.json());
      setStations((await stationsResponse.json()).stations);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/v1/overview", { cache: "no-store" }),
      fetch("/api/v1/stations", { cache: "no-store" }),
    ])
      .then(async ([overviewResponse, stationsResponse]) => {
        if (!overviewResponse.ok || !stationsResponse.ok)
          throw new Error("Không thể đọc dữ liệu đánh giá");
        const [overviewData, stationData] = await Promise.all([
          overviewResponse.json(),
          stationsResponse.json(),
        ]);
        if (active) {
          setOverview(overviewData);
          setStations(stationData.stations);
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải dữ liệu",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      stations.filter(
        (station) =>
          (status === "all" || station.status === status) &&
          station.id.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, stations, status],
  );
  const priorityStations = stations
    .filter((station) => station.status === "critical")
    .slice(0, 5);

  if (loading)
    return (
      <main className="state-screen">
        <RefreshCw className="spin" aria-hidden="true" />
        <p>Đang chuẩn bị bản tóm tắt vận hành…</p>
      </main>
    );

  if (error || !overview)
    return (
      <main className="state-screen">
        <AlertTriangle aria-hidden="true" />
        <h1>Không thể tải bảng điều hành</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={loadData}>
          Thử lại
        </button>
      </main>
    );

  const o = overview.overview;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Activity size={19} />
          </span>
          <div>
            <strong>RouteGuard</strong>
            <span>Điều hành trạm</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X />
          </button>
        </div>
        <nav aria-label="Điều hướng chính">
          <a className="active" href="#overview">
            <LayoutDashboard /> Tổng quan
          </a>
          <a href="#actions">
            <ClipboardCheck /> Việc cần xử lý
          </a>
          <a href="#stations">
            <Server /> Danh sách trạm
          </a>
          <a href="#method">
            <FileSearch /> Cách đọc dữ liệu
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="source-status">
            <Database />
            <div>
              <strong>Dữ liệu đã kiểm tra</strong>
              <span>17 trạm · 204 tuyến</span>
            </div>
          </div>
          <p>
            Công cụ hỗ trợ ưu tiên hành động. Không thay thế quyết định của quản
            lý vận hành.
          </p>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      <main className="workspace">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </button>
          <div>
            <p>Bảng điều hành vận hành</p>
            <h1>Kiểm soát rủi ro định tuyến theo trạm</h1>
          </div>
          <div className="topbar-actions">
            <button aria-label="Thông báo" className="icon-button">
              <Bell />
            </button>
            <span className="snapshot-pill">
              <span /> Dữ liệu đã sẵn sàng
            </span>
          </div>
        </header>

        <div className="content">
          <section className="executive-hero" id="overview">
            <div className="hero-copy">
              <span className="eyebrow">Tóm tắt dành cho quản lý</span>
              <h2>
                {o.statusCounts.critical} trạm cần được kiểm tra trước lần cập
                nhật mô hình tiếp theo
              </h2>
              <p>
                Các trạm này phụ thuộc nhiều vào lịch sử vận hành tại chỗ. Nếu dữ
                liệu bị thiếu, lỗi hoặc không còn phù hợp, thứ tự giao hàng được
                đề xuất có thể giảm chất lượng rõ rệt.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#actions">
                  Xem danh sách ưu tiên
                </a>
                <button className="secondary-button" onClick={loadData}>
                  <RefreshCw /> Cập nhật dữ liệu
                </button>
              </div>
            </div>
            <div className="hero-decision">
              <span>Quyết định khuyến nghị</span>
              <strong>Kiểm tra theo từng trạm</strong>
              <p>
                Không triển khai một bản cập nhật mô hình cho toàn mạng lưới chỉ
                dựa trên kết quả trung bình.
              </p>
              <div>
                <ShieldCheck /> Yêu cầu chạy thử tại các trạm rủi ro cao
              </div>
            </div>
          </section>

          <section className="summary-grid" aria-label="Tình trạng mạng lưới">
            <SummaryCard
              icon={<AlertTriangle />}
              label="Cần hành động"
              value={`${o.statusCounts.critical} trạm`}
              detail="Kiểm tra trước khi đổi mô hình"
              tone="critical"
            />
            <SummaryCard
              icon={<Eye />}
              label="Cần theo dõi"
              value={`${o.statusCounts.watch} trạm`}
              detail="Đưa vào kỳ đánh giá tiếp theo"
              tone="watch"
            />
            <SummaryCard
              icon={<CheckCircle2 />}
              label="Chưa cần can thiệp"
              value={`${o.statusCounts.stable} trạm`}
              detail="Tiếp tục quy trình hiện tại"
              tone="stable"
            />
            <SummaryCard
              icon={<Gauge />}
              label="Phạm vi đã đánh giá"
              value={`${o.routes} tuyến`}
              detail={`${o.stations} trạm, cùng một cách kiểm tra`}
              tone="neutral"
            />
          </section>

          <section className="business-explainer panel">
            <div className="explainer-title">
              <span className="eyebrow">Dữ liệu này trả lời điều gì?</span>
              <h3>
                Trạm nào sẽ chịu ảnh hưởng nhiều nhất nếu tín hiệu lịch sử không
                còn đáng tin?
              </h3>
            </div>
            <div className="explainer-flow">
              <div>
                <span>1</span>
                <strong>Rủi ro đầu vào</strong>
                <p>Dữ liệu lịch sử tại trạm bị thiếu, lỗi hoặc đã lỗi thời.</p>
              </div>
              <div>
                <span>2</span>
                <strong>Ảnh hưởng vận hành</strong>
                <p>Thứ tự điểm giao có thể lệch nhiều hơn so với cách tài xế thực hiện.</p>
              </div>
              <div>
                <span>3</span>
                <strong>Quyết định cần đưa ra</strong>
                <p>Trạm nào phải chạy thử, kiểm tra dữ liệu hoặc giữ phương án dự phòng.</p>
              </div>
            </div>
            <p className="meaning-note">
              “Suy giảm” ở đây là suy giảm chất lượng xếp thứ tự tuyến, không phải
              phần trăm tăng trực tiếp của chi phí, thời gian giao hay tỷ lệ giao
              trễ.
            </p>
          </section>

          <section className="action-layout" id="actions">
            <article className="panel priority-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Ưu tiên xử lý</span>
                  <h3>5 trạm nên kiểm tra trước</h3>
                  <p>Xếp theo mức suy giảm chất lượng khi mất lịch sử cục bộ.</p>
                </div>
                <span className="action-count">
                  {o.statusCounts.critical} trạm trong danh sách
                </span>
              </div>
              <div className="priority-list">
                {priorityStations.map((station, index) => (
                  <button
                    className="priority-row"
                    key={station.id}
                    onClick={() => setSelected(station)}
                  >
                    <span className="rank">{index + 1}</span>
                    <span className="priority-station">
                      <strong>Trạm {station.id}</strong>
                      <small>{station.routes} tuyến đã được kiểm tra</small>
                    </span>
                    <span className="impact">
                      <small>Mức ảnh hưởng</small>
                      <strong>{impactLevel(station)}</strong>
                    </span>
                    <span className="priority-action">
                      Kiểm tra dữ liệu + chạy thử
                    </span>
                    <span className="view-detail">Xem chi tiết</span>
                  </button>
                ))}
              </div>
            </article>

            <aside className="panel plan-panel">
              <span className="eyebrow">Kế hoạch hành động</span>
              <h3>Đề xuất cho kỳ vận hành tiếp theo</h3>
              <div className="plan-item urgent">
                <span>{o.statusCounts.critical}</span>
                <div>
                  <strong>Trạm cần chạy kiểm tra</strong>
                  <p>Trước khi cập nhật mô hình hoặc làm mới dữ liệu lịch sử.</p>
                </div>
              </div>
              <div className="plan-item monitor">
                <span>{o.statusCounts.watch}</span>
                <div>
                  <strong>Trạm cần thêm theo dõi</strong>
                  <p>Đánh giá lại trong chu kỳ kế tiếp, chưa cần can thiệp ngay.</p>
                </div>
              </div>
              <div className="plan-item okay">
                <span>{o.statusCounts.stable}</span>
                <div>
                  <strong>Trạm chưa cần thay đổi</strong>
                  <p>Giữ quy trình hiện tại và tiếp tục thu thập dữ liệu.</p>
                </div>
              </div>
              <div className="plan-callout">
                <ClipboardCheck />
                <p>
                  Ưu tiên nguồn lực kiểm thử cho nhóm “Cần hành động” thay vì chạy
                  lại toàn bộ mạng lưới.
                </p>
              </div>
            </aside>
          </section>

          <section className="panel station-panel" id="stations">
            <div className="station-heading">
              <div>
                <span className="eyebrow">Toàn bộ mạng lưới</span>
                <h3>Quyết định theo từng trạm</h3>
                <p>
                  Danh sách này tập trung vào hành động cần làm, không yêu cầu người
                  dùng hiểu thuật toán phía sau.
                </p>
              </div>
              <div className="table-tools">
                <label className="search-box">
                  <Search />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm mã trạm"
                    aria-label="Tìm mã trạm"
                  />
                </label>
                <label className="select-box">
                  <SlidersHorizontal />
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as typeof status)
                    }
                    aria-label="Lọc theo quyết định"
                  >
                    <option value="all">Tất cả quyết định</option>
                    <option value="critical">Cần hành động</option>
                    <option value="watch">Cần theo dõi</option>
                    <option value="stable">Chưa cần can thiệp</option>
                  </select>
                  <ChevronDown />
                </label>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Trạm</th>
                    <th>Quyết định</th>
                    <th>Mức ảnh hưởng</th>
                    <th>Việc nên làm</th>
                    <th>Cơ sở đánh giá</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((station) => (
                    <tr key={station.id}>
                      <td>
                        <button
                          className="station-link"
                          onClick={() => setSelected(station)}
                        >
                          {station.id}
                          <span>
                            {station.cohort === "confirmation"
                              ? "Nhóm xác nhận"
                              : "Nhóm thăm dò"}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={`status ${station.status}`}>
                          <i /> {statusText[station.status]}
                        </span>
                      </td>
                      <td>
                        <strong className={`impact-text ${station.status}`}>
                          {impactLevel(station)}
                        </strong>
                      </td>
                      <td className="recommendation-cell">
                        {recommendation(station.status)}
                      </td>
                      <td>{station.routes} tuyến</td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => setSelected(station)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="empty-state">
                  Không có trạm phù hợp bộ lọc.
                </div>
              )}
            </div>
          </section>

          <section className="method-card" id="method">
            <div>
              <FileSearch />
              <div>
                <strong>Cách đọc kết quả</strong>
                <p>
                  Mỗi trạm được kiểm tra trong hai tình huống: có lịch sử tại chỗ
                  và không sử dụng lịch sử tại chỗ. Chênh lệch giúp xác định mức
                  độ phụ thuộc của trạm vào dữ liệu lịch sử.
                </p>
              </div>
            </div>
            <details>
              <summary>Xem bằng chứng kỹ thuật</summary>
              <p>
                Trên nhóm xác nhận, {overview.confirmation.degradedStations}/
                {overview.confirmation.stations} trạm suy giảm; mức suy giảm tương
                đối trung bình là {formatPercent(overview.confirmation.relativeDegradation)}.
                Khoảng tin cậy của chênh lệch là [
                {overview.confirmation.deltaCi95.map(formatScore).join("; ")}].
                Điểm thấp hơn là tốt hơn.
              </p>
            </details>
          </section>

          <footer>
            <span>
              Cập nhật từ dữ liệu đã kiểm tra · {new Date(overview.generatedAt).toLocaleDateString("vi-VN")}
            </span>
            <span>Khuyến nghị cần được xác nhận bằng dữ liệu vận hành thực tế.</span>
          </footer>
        </div>
      </main>

      {selected && (
        <div
          className="drawer-layer"
          role="presentation"
          onMouseDown={() => setSelected(null)}
        >
          <aside
            className="detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="station-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="drawer-close"
              onClick={() => setSelected(null)}
              aria-label="Đóng"
            >
              <X />
            </button>
            <span className={`status ${selected.status}`}>
              <i /> {statusText[selected.status]}
            </span>
            <h2 id="station-title">Trạm {selected.id}</h2>
            <p className="drawer-subtitle">
              Kết luận vận hành dựa trên {selected.routes} tuyến đã được đánh giá
              theo cùng một quy trình.
            </p>

            <section className="business-impact-card">
              <span>Nếu tín hiệu lịch sử tại trạm không còn đáng tin</span>
              <strong>
                Chất lượng xếp thứ tự tuyến có thể giảm khoảng{" "}
                {formatPercent(Math.max(selected.relativeGap, 0))}
              </strong>
              <p>
                Đây là chỉ số chất lượng tuyến, không phải phần trăm tăng trực tiếp
                của thời gian hoặc chi phí giao hàng.
              </p>
            </section>

            <h3>Quản lý vận hành nên làm gì?</h3>
            <ul className="action-list">
              {selected.status === "critical" ? (
                <>
                  <li>Kiểm tra độ đầy đủ và độ mới của dữ liệu lịch sử tại trạm.</li>
                  <li>Chạy thử bản cập nhật trên dữ liệu gần nhất trước khi áp dụng.</li>
                  <li>Duy trì phương án định tuyến dự phòng cho trạm.</li>
                </>
              ) : selected.status === "watch" ? (
                <>
                  <li>Đưa trạm vào danh sách theo dõi của kỳ tiếp theo.</li>
                  <li>So sánh kết quả trước và sau mỗi lần cập nhật mô hình.</li>
                </>
              ) : (
                <>
                  <li>Tiếp tục vận hành theo quy trình hiện tại.</li>
                  <li>Duy trì thu thập dữ liệu và đánh giá định kỳ.</li>
                </>
              )}
            </ul>

            <details className="technical-detail">
              <summary>Chi tiết dữ liệu tham chiếu</summary>
              <div>
                <span>Khi có lịch sử tại trạm</span>
                <strong>{formatScore(selected.knownStationScore)}</strong>
              </div>
              <div>
                <span>Khi không dùng lịch sử tại trạm</span>
                <strong>{formatScore(selected.coldStartScore)}</strong>
              </div>
              <p>Điểm thấp hơn thể hiện thứ tự tuyến gần với thực tế hơn.</p>
            </details>

            <div className="drawer-note">
              <AlertTriangle />
              <p>
                Đây là công cụ sàng lọc ưu tiên. Trước khi thay đổi vận hành, cần
                xác nhận bằng dữ liệu mới của chính trạm.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
