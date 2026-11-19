"use client";

import { useState, type ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/lib/auth-context";
import type { Faq, FaqCategory, FaqItem } from "@/lib/support";
import { button, field, primary, useSupportList, useSupportConfirmation } from "@/components/admin/SupportEditor";

const api = "/api/admin/support/faq";

function SortableRow({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, attributes, listeners } = useSortable({ id });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: transition }}
    className="flex items-start gap-2 border-b border-border bg-white py-2">
    <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners}
      aria-label={label + " 순서 이동"} title="끌어서 이동하거나 스페이스와 방향키를 사용하세요"
      className="touch-none cursor-grab rounded-control px-2 py-2 text-text-3 focus-visible:outline-primary">☰</button>
    <div className="min-w-0 flex-1">{children}</div>
  </li>;
}

function SortList<T extends { id: string }>({ items, label, children, change }: {
  items: T[]; label: (item: T) => string; children: (item: T) => ReactNode; change: (items: T[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
    if (!over || over.id === active.id) return;
    change(arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)));
  }}>
    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
      <ul>{items.map(item => <SortableRow key={item.id} id={item.id} label={label(item)}>{children(item)}</SortableRow>)}</ul>
    </SortableContext>
  </DndContext>;
}

function Editor({ initial, saved }: { initial: Faq; saved: (value: Faq) => void }) {
  const { fetchWithAuth } = useAuth();
  const { ask, confirmation } = useSupportConfirmation();
  const [baseline, setBaseline] = useState(initial);
  const [categories, setCategories] = useState(initial.categories);
  const [selected, select] = useState(initial.categories[0]?.id);
  const [opened, open] = useState<string | null>(null);
  const [error, setError] = useState("");
  const category = categories.find(c => c.id === selected);
  const dirty = categories !== baseline.categories;

  function updateCategory(id: string, changes: Partial<FaqCategory>) {
    setCategories(all => all.map(c => c.id === id ? { ...c, ...changes } : c));
  }
  function updateItem(id: string, changes: Partial<FaqItem>) {
    if (category) updateCategory(category.id, { items: category.items.map(i => i.id === id ? { ...i, ...changes } : i) });
  }
  function moveItem(item: FaqItem, target: string) {
    setCategories(all => all.map(c => {
      if (c.id === selected) return { ...c, items: c.items.filter(i => i.id !== item.id) };
      if (c.id === target) return { ...c, items: [...c.items, item] };
      return c;
    }));
    select(target);
  }

  function publish() {
    const next = categories.map(c => ({ ...c, title: c.title.trim(), items: c.items.map(i => ({
      ...i, q: i.q.trim(), a: i.a.map(p => p.trim()).filter(Boolean),
    })) }));
    for (const c of next) {
      const missing = c.items.find(i => !i.q || !i.a.length || i.a.some(p => p.length > 10000));
      if (!c.title || missing) {
        select(c.id); open(missing?.id ?? null);
        setError("분류명, 질문, 답변을 입력해 주세요. 답변은 한 문단에 10,000자까지 쓸 수 있어요."); return;
      }
    }
    setError("");
    ask("변경한 FAQ 내용과 순서를 게시할까요?", async () => {
      const result = await fetchWithAuth<Faq>(api, { method: "PUT", body: { revision: baseline.revision, categories: next } });
      setBaseline(result); setCategories(result.categories); saved(result);
    });
  }

  return <>
    <div className="my-4 flex flex-wrap items-center gap-3">
      <button className={primary} disabled={!dirty} onClick={publish}>변경사항 게시</button>
      {dirty && <><span className="text-label text-text-3">저장 전 변경사항이 있어요.</span>
        <button className={button} onClick={() => { setCategories(baseline.categories); select(baseline.categories[0]?.id); setError(""); }}>변경 취소</button></>}
    </div>
    {confirmation}
    {error && <p role="alert" className="mb-3">{error}</p>}
    <div className="grid gap-6 md:grid-cols-[minmax(12rem,1fr)_minmax(0,2.5fr)]">
      <section aria-label="분류 목록">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">분류</h2>
          <button className={button} onClick={() => {
            const id = crypto.randomUUID(); setCategories([...categories, { id, title: "", lead: "", items: [] }]); select(id);
          }}>분류 추가</button></div>
        <SortList items={categories} label={c => c.title || "새 분류"} change={setCategories}>
          {c => <button type="button" aria-pressed={selected === c.id} onClick={() => select(c.id)}
            className={`w-full rounded-control px-2 py-2 text-left ${selected === c.id ? "bg-surface-2 font-bold text-primary" : ""}`}>
            {c.title || "새 분류"} <span className="text-label text-text-3">({c.items.length})</span></button>}
        </SortList>
      </section>
      {category && <section aria-label="분류 편집" className="min-w-0">
        <div className="grid gap-3 rounded-card border border-border p-4">
          <label>분류명<input className={field} maxLength={100} value={category.title} onChange={e => updateCategory(category.id, { title: e.target.value })} /></label>
          <label>분류 설명<input className={field} maxLength={300} value={category.lead} onChange={e => updateCategory(category.id, { lead: e.target.value })} /></label>
          {!category.items.length && <button className={button} onClick={() => {
            const rest = categories.filter(c => c.id !== category.id); setCategories(rest); select(rest[0]?.id);
          }}>빈 분류 삭제</button>}
        </div>
        <div className="my-4 flex items-center justify-between"><h2 className="font-bold">질문 {category.items.length}개</h2>
          <button className={button} onClick={() => {
            const item = { id: crypto.randomUUID(), q: "", a: [""] }; updateCategory(category.id, { items: [...category.items, item] }); open(item.id);
          }}>질문 추가</button></div>
        <SortList items={category.items} label={i => i.q || "새 질문"} change={items => updateCategory(category.id, { items })}>
          {i => <>
            <button aria-expanded={opened === i.id} className="w-full break-words py-2 text-left font-bold" onClick={() => open(opened === i.id ? null : i.id)}>
              {i.q || "새 질문"}</button>
            {opened === i.id && <div className="grid gap-3 pb-3">
              <label>질문<input className={field} maxLength={500} value={i.q} onChange={e => updateItem(i.id, { q: e.target.value })} /></label>
              <label>답변<textarea className={field} rows={5} value={i.a.join("\n\n")} onChange={e => updateItem(i.id, { a: e.target.value.split("\n\n") })} /></label>
              <label>분류<select className={field} value={selected} onChange={e => moveItem(i, e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.title || "새 분류"}</option>)}</select></label>
              <button className={button} onClick={() => updateCategory(category.id, { items: category.items.filter(row => row.id !== i.id) })}>질문 삭제</button>
            </div>}
          </>}
        </SortList>
      </section>}
    </div>
  </>;
}

export default function AdminFaq() {
  const list = useSupportList<Faq>(api);
  const [refresh, setRefresh] = useState(0);
  return <main className="mx-auto max-w-5xl">
    <header className="flex items-center justify-between"><h1 className="text-title-l font-bold">자주 묻는 질문</h1>
      <button className={button} onClick={() => { list.setData(null); setRefresh(n => n + 1); list.reload(); }}>새로고침</button></header>
    {list.error && <p role="alert">{list.error}</p>}
    {list.data ? <Editor key={refresh} initial={list.data} saved={list.setData} /> : !list.error && <p>FAQ를 불러오는 중이에요.</p>}
  </main>;
}
