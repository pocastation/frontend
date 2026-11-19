"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { CATEGORY_LABEL, noticeDate, type Notice } from "@/lib/support";
import { compressImage } from "@/lib/image-compress";
import { button, field, primary, useSupportConfirmation, useSupportList } from "@/components/admin/SupportEditor";

const api = "/api/admin/support/notices";
type Ask = ReturnType<typeof useSupportConfirmation>["ask"];

function PhotoPreview({ path, file }: { path?: string; file?: File }) {
  const { fetchBlobWithAuth } = useAuth();
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let preview: string | undefined;
    const blob = file ? Promise.resolve(file) : fetchBlobWithAuth(path!);
    blob.then(value => {
      if (active) { preview = URL.createObjectURL(value); setUrl(preview); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (preview) URL.revokeObjectURL(preview); };
  }, [file, path, fetchBlobWithAuth]);
  if (!url) return <span>{error ? "미리보기 실패" : "사진 불러오는 중…"}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="첨부 사진 미리보기" className="h-24 w-24 rounded-control object-contain" />;
}

function koreanInput(iso: string) {
  return new Date(Date.parse(iso) + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function NoticeForm({ notice, ask, done, cancel }: {
  notice: Notice | null; ask: Ask; done: (saved: Notice) => void; cancel: () => void;
}) {
  const { fetchMultipartWithAuth } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [keep, setKeep] = useState(notice?.photoIds ?? []);
  const [scheduled, setScheduled] = useState(() => !!notice && Date.parse(notice.publishAt) > Date.now());
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title")).trim();
    const body = String(values.get("body")).trim();
    if (!title || !body) { setError("제목과 본문을 입력해 주세요."); return; }
    let publishAt = notice && Date.parse(notice.publishAt) <= Date.now() ? notice.publishAt : null;
    if (scheduled) {
      const date = new Date(values.get("when") + ":00+09:00");
      if (!(date.getTime() > Date.now())) { setError("예약 게시 시각은 현재보다 늦어야 해요."); return; }
      publishAt = date.toISOString();
    }
    const draft = { title, body, category: values.get("category"), summary: String(values.get("summary")).trim(),
      hidden: values.has("hidden"), pinned: values.has("pinned"), publishAt, revision: notice?.revision ?? 0, keepPhotos: keep };
    setError("");
    const action = notice ? "수정할까요?" : draft.hidden ? "비공개로 저장할까요?" : scheduled ? "예약 게시할까요?" : "게시할까요?";
    ask(`‘${title}’ 공지를 ${action}`, async () => {
      const form = new FormData();
      form.set("draft", new Blob([JSON.stringify(draft)], { type: "application/json" }));
      for (const file of files) form.append("photos", await compressImage(file));
      done(await fetchMultipartWithAuth<Notice>(notice ? api + "/" + notice.slug : api, form));
    });
  }

  return <form onSubmit={submit} className="my-5 grid max-w-2xl gap-4 rounded-card border border-border p-5">
    <h2 className="text-title-s font-bold">{notice ? "공지 수정" : "새 공지"}</h2>
    <label>분류<select name="category" className={field} defaultValue={notice?.category ?? "service"}>
      {Object.entries(CATEGORY_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select></label>
    <label>제목<input name="title" required maxLength={200} defaultValue={notice?.title} className={field} /></label>
    <label>목록 요약<input name="summary" maxLength={500} defaultValue={notice?.summary} className={field} /></label>
    <label>본문<textarea name="body" required rows={8} maxLength={50000} defaultValue={notice?.body} className={field} /></label>
    <fieldset><legend className="mb-2">첨부 사진 (최대 5장, 장당 5MB)</legend>
      <div className="mb-2 flex flex-wrap gap-3">
        {keep.map(id => <div key={id}><PhotoPreview path={api + "/" + notice!.slug + "/photos/" + id} />
          <button type="button" className={button} onClick={() => setKeep(keep.filter(x => x !== id))}>사진 제거</button></div>)}
        {files.map((file, i) => <div key={file.name + "-" + file.lastModified + "-" + i}><PhotoPreview file={file} />
          <button type="button" className={button} onClick={() => setFiles(files.filter((_, n) => n !== i))}>사진 제거</button></div>)}
      </div>
      <input type="file" aria-label="사진 추가" multiple accept="image/jpeg,image/png,image/webp" disabled={keep.length + files.length >= 5} onChange={e => {
        const picked = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (picked.length + files.length + keep.length > 5 || picked.some(p => p.size > 5 * 1024 * 1024)) {
          setError("사진은 장당 5MB 이하, 총 5장까지 첨부할 수 있어요."); return;
        }
        setFiles([...files, ...picked]); setError("");
      }} />
    </fieldset>
    <div className="flex flex-wrap gap-5">
      <label><input name="pinned" type="checkbox" defaultChecked={notice?.pinned} /> 상단 고정</label>
      <label><input name="hidden" type="checkbox" defaultChecked={notice?.hidden} /> 비공개</label>
      <label><input type="checkbox" checked={scheduled} onChange={e => setScheduled(e.target.checked)} /> 예약 게시</label>
    </div>
    {scheduled && <label>게시 일시 (한국 시간)<input name="when" type="datetime-local" required className={field}
      defaultValue={notice ? koreanInput(notice.publishAt) : ""} /></label>}
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-2"><button className={primary}>{notice ? "수정 저장" : "공지 등록"}</button>
      <button type="button" className={button} onClick={cancel}>취소</button></div>
  </form>;
}

export default function AdminNotices() {
  const { fetchWithAuth } = useAuth();
  const list = useSupportList<Notice[]>(api);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { ask, confirmation } = useSupportConfirmation();
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  return <main className="mx-auto max-w-4xl">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-title-l font-bold">공지사항</h1>
      <div className="flex gap-2"><button className={button} onClick={() => { setEditing(null); list.reload(); }}>새로고침</button>
        <button className={primary} onClick={() => setEditing("new")}>공지 작성</button></div>
    </header>
    {confirmation}
    {editing && <NoticeForm key={editing === "new" ? "new" : editing.slug} notice={editing === "new" ? null : editing}
      ask={ask} cancel={() => setEditing(null)} done={saved => {
        list.setData(old => [saved, ...(old ?? []).filter(n => n.slug !== saved.slug)].sort((a,b) =>
          Number(b.pinned) - Number(a.pinned) || Date.parse(b.publishAt) - Date.parse(a.publishAt)));
        setEditing(null);
      }} />}
    {list.error && <p role="alert">{list.error}</p>}
    {!list.data && !list.error && <p>공지를 불러오는 중이에요.</p>}
    {list.data?.length === 0 && <p>등록된 공지가 없습니다.</p>}
    <ul className="divide-y divide-border border-y border-border">{list.data?.map(row =>
      <li key={row.slug} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0"><p className="text-label text-text-3">
          {row.pinned && "상단 고정 · "}{row.hidden ? "비공개" : Date.parse(row.publishAt) > now ? "예약" : "공개"}
          {" · "}{CATEGORY_LABEL[row.category]}{" · "}{noticeDate(row.publishAt)} {koreanInput(row.publishAt).slice(-5)}
        </p><h2 className="break-words font-bold">{row.title}</h2></div>
        <div className="flex gap-2"><button className={button} onClick={() => setEditing(row)}>수정</button>
          <button className={button} onClick={() => ask(`‘${row.title}’ 공지를 삭제할까요?`, async () => {
            await fetchWithAuth(api + "/" + row.slug + "?revision=" + row.revision, { method: "DELETE" });
            list.setData(old => old?.filter(n => n.slug !== row.slug) ?? []);
            if (editing !== "new" && editing?.slug === row.slug) setEditing(null);
          })}>삭제</button></div>
      </li>)}</ul>
  </main>;
}
