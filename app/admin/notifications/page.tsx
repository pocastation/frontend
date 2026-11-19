"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import PhotoUploadGrid from "@/components/PhotoUploadGrid";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import type { ArtistMemberResponse } from "@/lib/types";

type Kind = "ALL" | "EVENT" | "ARTIST";
type Target = { id: number; name: string };
type History = {
  id: number; title: string; targetName: string; marketing: boolean; scheduledAt: string; sentAt: string | null;
  recipients: number; opened: number; cancelledAt?: string | null;
};
const api = "/api/admin/notification-campaigns";
const date = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const input = "mt-tight w-full rounded-control border border-border-2 bg-white p-3 text-body";
const button = "rounded-control border border-border-2 px-4 py-2 text-body-s font-bold disabled:opacity-50";

function errorText(e: unknown) {
  return e instanceof Error ? e.message : "요청을 처리하지 못했어요. 다시 시도해 주세요.";
}

export default function AdminNotifications() {
  const { fetchWithAuth } = useAuth();
  const [kind, setKind] = useState<Kind>("ALL");
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState<number | null>(null);
  const [choices, setChoices] = useState<Target[]>([]);
  const [membershipIds, setMembershipIds] = useState<number[]>([]);
  const [roster, setRoster] = useState<{ artistId: number; members: ArtistMemberResponse[]; error?: string } | null>(null);
  const [retryRoster, setRetryRoster] = useState(0);
  const [marketing, setMarketing] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [when, setWhen] = useState("");
  const [preview, setPreview] = useState<{ key: string; count: number; requestId: string } | null>(null);
  const [history, setHistory] = useState<History[] | null>(null);
  const [more, setMore] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [notice, setNotice] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [cancelNotice, setCancelNotice] = useState("");
  const [reload, setReload] = useState(0);
  const photos = usePhotoUpload(5, setNotice);
  const photoUrls = photos.uploadedUrls.map(photo => photo.url);
  const photosReady = photos.items.length === photoUrls.length;
  const audience = kind === "ARTIST" && membershipIds.length > 0
    ? { kind: "ARTIST_MEMBERS", targetId, membershipIds, marketing }
    : { kind, targetId, marketing };
  const selectedRoster = roster?.artistId === targetId ? roster : null;
  const key = JSON.stringify([audience, title, message, scheduled, when, photoUrls]);
  const confirmed = preview?.key === key ? preview : null;

  useEffect(() => {
    if (kind === "ALL") return;
    let active = true;
    const timer = setTimeout(() => {
      fetchWithAuth<Target[]>(api + "/targets?" + new URLSearchParams({ kind, q: query }))
        .then(rows => { if (active) setChoices(rows); })
        .catch(e => { if (active) setNotice(errorText(e)); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchWithAuth, kind, query]);

  function selectTarget(id: number | null) {
    setTargetId(id);
    setMembershipIds([]);
    setRoster(null);
    setPreview(null);
  }

  useEffect(() => {
    if (kind !== "ARTIST" || targetId === null) return;
    let active = true;
    fetchWithAuth<{ content: ArtistMemberResponse[] }>("/api/artists/" + targetId + "/idols")
      .then(({ content }) => { if (active) setRoster({ artistId: targetId, members: content }); })
      .catch(e => { if (active) setRoster({ artistId: targetId, members: [], error: errorText(e) }); });
    return () => { active = false; };
  }, [fetchWithAuth, kind, targetId, retryRoster]);

  useEffect(() => {
    let active = true;
    fetchWithAuth<History[]>(api).then(rows => {
      if (active) { setHistory(rows); setMore(rows.length === 50); setHistoryError(""); }
    }).catch(e => { if (active) setHistoryError(errorText(e)); });
    return () => { active = false; };
  }, [fetchWithAuth, reload]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current || !photosReady) return;
    busy.current = true;
    setPending(true);
    setNotice("");
    try {
      const scheduledAt = scheduled ? new Date(when + ":00+09:00").toISOString() : null;
      if (scheduledAt && Date.parse(scheduledAt) <= Date.now()) throw new Error("미래의 예약 시각을 선택해 주세요.");
      if (!confirmed) {
        const result = await fetchWithAuth<{ count: number }>(api + "/preview", { method: "POST", body: audience });
        setPreview({ key, count: result.count, requestId: crypto.randomUUID() });
      } else if (confirmed.count > 0) {
        await fetchWithAuth(api, { method: "POST", body: {
          audience, title, message, scheduledAt, photoUrls, requestId: confirmed.requestId,
        } });
        setPreview(null); setTitle(""); setMessage(""); photos.reset();
        setNotice("발송 요청을 등록했어요."); setReload(value => value + 1);
      }
    } catch (err) { setNotice(errorText(err)); }
    finally { busy.current = false; setPending(false); }
  }

  async function cancelReservation(row: History) {
    if (busy.current || !window.confirm(`‘${row.title}’ 알림의 발송 예약을 취소할까요?`)) return;
    busy.current = true;
    setPending(true);
    setCancelNotice("");
    try {
      const result = await fetchWithAuth<{ cancelledAt: string }>(`${api}/${row.id}/cancel`, { method: "POST" });
      setHistory(rows => rows?.map(item => item.id === row.id ? { ...item, cancelledAt: result.cancelledAt } : item) ?? null);
      setCancelNotice(`‘${row.title}’ 발송 예약을 취소했어요.`);
    } catch (err) {
      setCancelNotice(errorText(err));
      setReload(value => value + 1);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function loadMore() {
    if (busy.current || !history?.length) return;
    busy.current = true; setPending(true);
    try {
      const rows = await fetchWithAuth<History[]>(api + "?before=" + history[history.length - 1].id);
      setHistory(prev => [...(prev ?? []), ...rows]); setMore(rows.length === 50); setHistoryError("");
    } catch (err) { setHistoryError(errorText(err)); }
    finally { busy.current = false; setPending(false); }
  }

  return <main className="mx-auto max-w-4xl px-gutter py-group">
    <h1 className="text-title-l font-bold">알림 발송</h1>
    <form onSubmit={submit} className="mt-group">
      <fieldset disabled={pending} className="grid max-w-xl gap-row">
        <label>발송 대상<select className={input} value={kind} onChange={e => {
          setKind(e.target.value as Kind); selectTarget(null); setQuery(""); setChoices([]);
        }}>
          <option value="ALL">전체 회원</option><option value="EVENT">특정 행사 참여자</option>
          <option value="ARTIST">특정 아티스트 관심 회원</option>
        </select></label>
        {kind !== "ALL" && <>
          <p className="text-body-s text-text-2">{kind === "EVENT"
            ? "이 행사에 교환글을 올리거나 교환을 신청한 이력이 있는 회원이에요."
            : "그룹 전체를 고르면 이 그룹의 판매글을 찜한 회원에게 보내요. 멤버를 여러 명 고르면 선택한 멤버 중 한 명이라도 판매글을 찜한 회원에게 한 번씩 보내요."}</p>
          <label>{kind === "EVENT" ? "행사 검색" : "아티스트 검색"}<input className={input} value={query}
            onChange={e => { setQuery(e.target.value); setChoices([]); selectTarget(null); }} /></label>
          <label>검색 결과<select required className={input} value={targetId ?? ""} onChange={e => selectTarget(Number(e.target.value) || null)}>
            <option value="">대상을 선택해 주세요</option>
            {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
          </select></label>
          {kind === "ARTIST" && targetId !== null && <>
            <fieldset><legend>멤버 선택</legend>
              <div className="mt-tight flex flex-wrap gap-tight">
                <label className={button}><input type="checkbox" className="mr-2" checked={!membershipIds.length}
                  onChange={() => { setMembershipIds([]); setPreview(null); }} />그룹 전체</label>
                {selectedRoster?.members.map(member => {
                  const id = member.membershipId;
                  if (id == null) return null;
                  return <label key={id} className={button}><input type="checkbox" className="mr-2"
                    checked={membershipIds.includes(id)} onChange={e => {
                      const checked = e.target.checked;
                      setMembershipIds(ids => checked ? [...ids, id] : ids.filter(value => value !== id));
                      setPreview(null);
                    }} />{member.stageName}{member.active === false ? " (이전 멤버)" : ""}</label>;
                })}
              </div>
            </fieldset>
            {!selectedRoster && <p role="status">멤버 목록을 불러오는 중이에요.</p>}
            {selectedRoster?.error && <div role="alert">멤버 목록을 불러오지 못했어요.{" "}
              <button className={button} type="button" onClick={() => setRetryRoster(v => v + 1)}>다시 불러오기</button>
            </div>}
          </>}
        </>}
        <label>알림 종류<select className={input} value={marketing ? "event" : "service"} onChange={e => setMarketing(e.target.value === "event")}>
          <option value="event">이벤트성 · 마케팅 수신 동의자만</option><option value="service">운영 안내</option>
        </select></label>
        <label>제목<input className={input} required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>내용<textarea className={input} required rows={3} maxLength={300} value={message} onChange={e => setMessage(e.target.value)} /></label>
        <fieldset><legend className="mb-tight">첨부 사진 (선택, 최대 5장)</legend>
          <PhotoUploadGrid items={photos.items} max={5} onAddFiles={files => { if (!busy.current) photos.addFiles(files); }}
            onRemove={photos.removeItem} onReorder={photos.setItems} />
          {photos.items.some(item => item.status === "error") && <p role="alert">업로드에 실패한 사진을 삭제한 뒤 다시 추가해 주세요.</p>}
        </fieldset>
        <label>발송 시점<select className={input} value={scheduled ? "later" : "now"} onChange={e => setScheduled(e.target.value === "later")}>
          <option value="now">즉시 발송</option><option value="later">예약 발송</option>
        </select></label>
        {scheduled && <label>예약 일시 (한국 시간)<input required type="datetime-local" className={input} value={when} onChange={e => setWhen(e.target.value)} /></label>}
        <p className="text-body-s text-text-2">한국 시간 21시부터 다음 날 08시 전까지는 발송을 보류해요. 푸시는 수신을 켠 기기에 전달돼요.</p>
        {confirmed && <p role="status" className="font-bold">예상 수신 회원 {confirmed.count.toLocaleString()}명</p>}
        <div className="flex flex-wrap gap-tight">
          <button className={button} disabled={!photosReady || confirmed?.count === 0}>
            {pending ? "처리 중…" : confirmed ? (scheduled ? "예약 확정" : "발송 확정") : "수신 인원 확인"}
          </button>
          {confirmed && <button type="button" className={button} onClick={() => setPreview(null)}>다시 확인</button>}
        </div>
      </fieldset>
    </form>
    {notice && <p className="mt-row" role="status">{notice}</p>}
    <section className="mt-section border-t border-border pt-group">
      <div className="flex items-center justify-between"><h2 className="text-title font-bold">발송 기록</h2>
        <button type="button" className={button} disabled={pending} onClick={() => setReload(v => v + 1)}>새로고침</button></div>
      {historyError && <p role="alert">{historyError}</p>}
      {cancelNotice && <p role="status" className="mt-row">{cancelNotice}</p>}
      {!historyError && !history?.length && <p className="py-group text-text-2">{history ? "등록된 발송이 없어요." : "발송 기록을 불러오는 중이에요."}</p>}
      <ul className="divide-y divide-border">{history?.map(row => <li key={row.id} className="py-row">
        <strong className="break-words">{row.title}</strong><p className="mt-tight text-body-s">{row.targetName}{row.marketing && " 중 마케팅 동의자"} · {row.sentAt ? "발송" : row.cancelledAt ? "기존 예약" : "발송 예정"} {date.format(new Date(row.sentAt ?? row.scheduledAt))}</p>
        {row.cancelledAt && <p className="mt-tight text-body-s">예약 취소됨 · {date.format(new Date(row.cancelledAt))}</p>}
        {!row.sentAt && row.cancelledAt === null && <button type="button" className={button + " mt-tight"}
          disabled={pending} onClick={() => cancelReservation(row)}>예약 취소</button>}
        {row.sentAt && <p className="text-body-s text-text-2">인앱 발송 {row.recipients.toLocaleString()}명 · 유입 {row.opened.toLocaleString()}명</p>}
      </li>)}</ul>
      {more && <button className={button} disabled={pending} onClick={loadMore}>더 보기</button>}
    </section>
  </main>;
}
