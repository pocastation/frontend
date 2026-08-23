"use client";

import { useCallback, useState, type DragEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MediaUploadResponse } from "@/lib/types";
import { FOCUS_RING } from "@/lib/ui";

// 업로드 타일 한 장의 상태. previewUrl은 로컬 object URL(즉시 프리뷰), uploaded는 서버 응답(완료 시).
export type PhotoItem = {
  id: string;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  uploaded?: MediaUploadResponse;
  error?: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  items: PhotoItem[];
  max: number;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (next: PhotoItem[]) => void;
};

// 판매 등록 사진 단계 그리드: 파일 드래그앤드롭 + 다중 선택 업로드 + 드래그로 순서 변경(첫 장=대표).
export default function PhotoUploadGrid({ items, max, onAddFiles, onRemove, onReorder }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const canAdd = items.length < max;
  // 대표사진 = 실제 제출되는 첫 이미지 = 순서상 첫 번째 비-에러 타일(에러는 제출에서 제외되므로).
  const coverId = items.find((i) => i.status !== "error")?.id;

  // 데스크탑=마우스 클릭 드래그(6px 이동), 모바일=길게 눌러 드래그(160ms)라 일반 탭·스크롤과 충돌하지 않는다.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pickFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter((f) => ALLOWED.includes(f.type));
      if (files.length) onAddFiles(files);
    },
    [onAddFiles],
  );

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (canAdd) pickFiles(e.dataTransfer.files);
  }
  function handleDragOver(e: DragEvent) {
    if (!canAdd) return;
    e.preventDefault();
    setDragActive(true);
  }
  function handleDragLeave(e: DragEvent) {
    // 존 바깥으로 나갈 때만 해제(자식 타일 위로 이동 시 깜빡임 방지).
    if (e.currentTarget === e.target) setDragActive(false);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`rounded-r2 border border-dashed p-2 transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-border-2"
      }`}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {items.map((item, index) => (
              <SortableTile
                key={item.id}
                item={item}
                index={index}
                isCover={item.id === coverId}
                onRemove={onRemove}
              />
            ))}
            {canAdd && (
              <label
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-r2 border border-border text-text-3 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  +
                </span>
                <span className="text-[10px] font-semibold">사진 추가</span>
                <input
                  type="file"
                  accept={ACCEPT}
                  multiple
                  onChange={(e) => {
                    pickFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </SortableContext>
      </DndContext>
      <p className="mt-2 text-center text-[11px] text-text-3">
        {dragActive
          ? "여기에 놓으면 업로드돼요"
          : "사진을 끌어다 놓거나 클릭해서 올리고, 드래그로 순서를 바꿀 수 있어요"}
      </p>
    </div>
  );
}

function SortableTile({
  item,
  index,
  isCover,
  onRemove,
}: {
  item: PhotoItem;
  index: number;
  isCover: boolean;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative select-none"
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 전 로컬 object URL 프리뷰 */}
      <img
        src={item.previewUrl}
        alt={`업로드 사진 ${index + 1}`}
        draggable={false}
        className="aspect-square w-full rounded-r2 border border-border object-cover"
      />
      {item.status === "uploading" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-r2 bg-black/40 text-[10px] text-white">
          업로드 중…
        </div>
      )}
      {item.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-r2 bg-black/55 px-1 text-center text-[9px] text-white">
          업로드 실패
        </div>
      )}
      {isCover && (
        <span className="absolute left-1 top-1 rounded-[3px] bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
          대표
        </span>
      )}
      <button
        type="button"
        aria-label={`${index + 1}번째 사진 삭제`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white transition-transform hover:scale-110 active:scale-95 ${FOCUS_RING}`}
      >
        ×
      </button>
    </div>
  );
}
