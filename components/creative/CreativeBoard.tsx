'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import type { MemberTask } from '@/lib/creative';

function isVideoFile(fileName: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(fileName);
}

function extractFileId(driveLink: string): string | null {
  const match = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isPastDeadline(deadline: string): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function taskKey(t: MemberTask): string {
  return `${t.clientName}:${t.batch}:${t.fileName}`;
}

export function CreativeBoard({ member }: { member: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<MemberTask[] | null>(null);
  const [linkDraftFor, setLinkDraftFor] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [openHistory, setOpenHistory] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/creative/board?member=${encodeURIComponent(member)}`);
    if (res.status === 401) {
      router.refresh();
      return;
    }
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }, [member, router]);

  useEffect(() => {
    load();
  }, [load]);

  function changeRole() {
    sessionStorage.removeItem('creative_role');
    sessionStorage.removeItem('creative_member');
    router.push('/creative');
  }

  async function patch(
    task: MemberTask,
    patchBody: Partial<Pick<MemberTask, 'productionStatus' | 'newVersionLink'>>
  ) {
    const key = taskKey(task);
    setPendingKey(key);
    setTasks((prev) => (prev ? prev.map((t) => (taskKey(t) === key ? { ...t, ...patchBody } : t)) : prev));
    try {
      await fetch('/api/creative/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: task.clientName,
          fileName: task.fileName,
          batch: task.batch,
          ...patchBody,
        }),
      });
    } finally {
      setPendingKey(null);
    }
  }

  function toggleHistory(key: string) {
    setOpenHistory((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (tasks === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-asight-lavande border-t-asight-violet" />
      </main>
    );
  }

  const pending = [...tasks]
    .filter((t) => t.productionStatus !== 'Prête')
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  const done = tasks.filter((t) => t.productionStatus === 'Prête');

  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 sm:px-6">
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between">
        <Logo />
        <div className="text-right">
          <p className="font-body text-sm font-semibold text-asight-dark">{member}</p>
          <button
            onClick={changeRole}
            className="font-body text-xs text-asight-dark/40 hover:text-asight-dark"
          >
            Changer de rôle
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="font-heading text-xl font-bold text-asight-dark">
          Mes créas à retravailler
        </h1>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-asight-muted px-4 py-8 text-center font-body text-sm text-asight-dark/40">
            Rien à faire pour le moment 🎉
          </p>
        ) : (
          pending.map((task) => {
            const key = taskKey(task);
            const fileId = extractFileId(task.driveLink);
            const late = isPastDeadline(task.deadline);
            const historyOpen = openHistory.has(key);

            return (
              <div key={key} className="rounded-2xl border border-asight-lavande bg-white p-4 shadow-card">
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-asight-lavande/40">
                    {isVideoFile(task.fileName) ? (
                      <span className="text-2xl">🎬</span>
                    ) : fileId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/drive/file/${fileId}`}
                        alt={task.fileName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🖼️</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-bold text-asight-dark">
                      {task.fileName}
                    </p>
                    <p className="font-body text-xs text-asight-dark/50">
                      {task.clientName} — {task.batch}
                    </p>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border-l-4 border-asight-violet bg-asight-lavande px-3 py-2 font-body text-sm text-asight-dark">
                  {task.comment}
                </p>

                {task.history.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleHistory(key)}
                      className="font-body text-xs font-semibold text-asight-dark/40 hover:text-asight-dark"
                    >
                      {historyOpen ? 'Masquer' : 'Voir'} l&apos;historique ({task.history.length})
                    </button>
                    {historyOpen && (
                      <div className="mt-1 flex flex-col gap-1 border-l-2 border-asight-lavande pl-2">
                        {task.history.map((h, i) => (
                          <p key={i} className="font-body text-xs text-asight-dark/40">
                            <span className="font-semibold">{h.batch} :</span> {h.comment}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={`font-body text-xs ${
                      late ? 'font-bold text-asight-red' : 'text-asight-dark/40'
                    }`}
                  >
                    {task.deadline ? `Deadline : ${formatDate(task.deadline)}` : 'Pas de deadline'}
                  </p>
                  {fileId && (
                    <a
                      href={`/api/drive/download?fileId=${fileId}&fileName=${encodeURIComponent(task.fileName)}`}
                      className="font-body text-xs font-semibold text-asight-violet hover:underline"
                    >
                      ⬇️ Télécharger l&apos;original
                    </a>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => patch(task, { productionStatus: 'En cours' })}
                    disabled={pendingKey === key || task.productionStatus === 'En cours'}
                    className="rounded-full border-2 border-asight-violet px-4 py-2 font-body text-xs font-semibold text-asight-violet transition-colors hover:bg-asight-lavande disabled:opacity-50"
                  >
                    ▶️ En cours
                  </button>
                  {linkDraftFor === key ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={linkValue}
                        onChange={(e) => setLinkValue(e.target.value)}
                        placeholder="Lien Drive de la nouvelle version"
                        autoFocus
                        className="flex-1 rounded-lg border border-asight-muted px-3 py-2 font-body text-xs outline-none focus:ring-2 focus:ring-asight-violet"
                      />
                      <button
                        onClick={async () => {
                          if (!linkValue.trim()) return;
                          await patch(task, {
                            productionStatus: 'Prête',
                            newVersionLink: linkValue.trim(),
                          });
                          setLinkDraftFor(null);
                          setLinkValue('');
                        }}
                        className="rounded-full bg-asight-violet px-4 py-2 font-body text-xs font-semibold text-white hover:bg-asight-violet-dark"
                      >
                        Confirmer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setLinkDraftFor(key);
                        setLinkValue(task.newVersionLink);
                      }}
                      className="rounded-full bg-asight-green px-4 py-2 font-body text-xs font-semibold text-asight-dark transition-colors hover:brightness-95"
                    >
                      ✅ Prête
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        <button
          onClick={() => setDoneOpen((v) => !v)}
          className="mt-4 text-left font-body text-sm font-semibold text-asight-dark/60 hover:text-asight-dark"
        >
          {doneOpen ? '▾' : '▸'} Mes créas livrées ({done.length})
        </button>
        {doneOpen && (
          <div className="flex flex-col gap-2">
            {done.length === 0 ? (
              <p className="font-body text-sm text-asight-dark/40">Rien de livré pour le moment.</p>
            ) : (
              done.map((task) => (
                <div
                  key={taskKey(task)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-asight-lavande bg-asight-lavande/30 px-4 py-2"
                >
                  <p className="truncate font-body text-sm text-asight-dark/50 line-through">
                    {task.fileName}
                  </p>
                  <p className="whitespace-nowrap font-body text-xs text-asight-dark/40">
                    {task.clientName} — {task.batch}
                  </p>
                  {task.newVersionLink && (
                    <a
                      href={task.newVersionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap font-body text-xs font-semibold text-asight-violet hover:underline"
                    >
                      Nouvelle version
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
