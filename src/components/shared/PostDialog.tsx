'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ThreadsPreview } from '@/components/shared/ThreadsPreview';
import { FacebookIcon } from '@/components/shared/FacebookIcon';
import { formatFacebookPostFromBlocks } from '@/lib/reddit-format';
import type { PostBlock } from '@/lib/parseThreadsPost';
import { PostLanguage } from '@/types/post';

type Tab = 'threads' | 'facebook' | 'edit' | 'image' | 'video';

type VideoState =
  | { phase: 'idle' }
  | { phase: 'capturing' }
  | { phase: 'rendering'; jobId: string; cancelling?: boolean }
  | { phase: 'completed'; jobId: string; videoPath: string }
  | { phase: 'failed'; error: string };

type SixGateJob = {
  id: string;
  destinationId: string;
  destinationName: string;
  destinationIcon: string;
  platform: string;
  jobDetailsLink: string;
};

type SixGateState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'submitted'; jobs: SixGateJob[] }
  | { phase: 'failed'; error: string };

type JobStatus =
  | 'Created'
  | 'Initializing'
  | 'Uploading'
  | 'Finishing'
  | 'Processing'
  | 'Published'
  | 'Failed'
  | 'Retrying'
  | 'ReconnectRequired'
  | 'Cancelled';

type JobInfo = {
  status: JobStatus;
  providerPostUrl: string | null;
  errorMessage: string | null;
};

const SIXGATE_ACCOUNT_ID = 'group_iLWxB0Zl';

type NodeStatus = 'pending' | 'active' | 'success' | 'failed';

function platformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'youtube': return '▶';
    case 'tiktok': return '🎵';
    case 'facebook': return 'f';
    case 'instagram': return '◇';
    default: return '◆';
  }
}

function PipelineNode({
  icon,
  label,
  status,
  detail,
  compact,
  onRetry,
  onClick,
  selected,
}: {
  icon: string;
  label: string;
  status: NodeStatus;
  detail?: string;
  compact?: boolean;
  onRetry?: () => void;
  onClick?: () => void;
  selected?: boolean;
}) {
  const ring =
    selected ? 'border-accent shadow-[0_0_0_2px_rgba(99,102,241,0.45)]' :
    status === 'active' ? 'border-accent shadow-[0_0_0_3px_rgba(99,102,241,0.15)]' :
    status === 'success' ? 'border-emerald-500/50' :
    status === 'failed' ? 'border-fall/60' :
    'border-divider';

  const iconBg =
    status === 'active' ? 'bg-accent/15 text-accent' :
    status === 'success' ? 'bg-emerald-500/15 text-emerald-500' :
    status === 'failed' ? 'bg-fall/15 text-fall' :
    'bg-divider/40 text-muted';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border bg-surface ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${ring} transition-colors ${onClick ? 'cursor-pointer hover:bg-surface/80' : ''}`}
    >
      <div className={`shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-primary leading-tight">{label}</p>
        {detail && <p className="text-[10px] text-muted truncate leading-tight mt-0.5">{detail}</p>}
      </div>
      {onRetry && (status === 'success' || status === 'failed') && (
        <button
          onClick={(e) => { e.stopPropagation(); onRetry(); }}
          title="Re-run this step"
          className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-[11px] text-muted hover:text-primary hover:bg-divider/40 cursor-pointer bg-transparent border-0 transition-colors"
        >
          ↺
        </button>
      )}
      <StatusDot status={status} />
    </div>
  );
}

function StatusDot({ status }: { status: NodeStatus }) {
  if (status === 'active') {
    return <div className="shrink-0 h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />;
  }
  if (status === 'success') {
    return <div className="shrink-0 h-2 w-2 rounded-full bg-emerald-500" />;
  }
  if (status === 'failed') {
    return <div className="shrink-0 h-2 w-2 rounded-full bg-fall" />;
  }
  return <div className="shrink-0 h-2 w-2 rounded-full bg-divider" />;
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-start pl-[14px]">
      <div className={`w-px h-4 ${active ? 'bg-accent/40' : 'bg-divider'}`} />
    </div>
  );
}

type HandleSpec = { type: 'target' | 'source'; position: 'top' | 'right' | 'bottom' | 'left' };

type FlowNodeData = {
  label: string;             // used as tooltip/aria, not displayed
  iconSrc?: string;          // image path in /public
  iconEmoji?: string;        // fallback when no iconSrc
  status: NodeStatus;
  result?: string | null;    // shown inside node when status === 'success'
  resultIsLink?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  isSelected?: boolean;
  handles: HandleSpec[];
};

const positionMap = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const;

function FlowPipelineNode(props: NodeProps) {
  const data = props.data as unknown as FlowNodeData;
  const isActive = data.status === 'active';

  const wrapperCls =
    isActive ? 'border-transparent' :
    data.status === 'success' ? 'border-emerald-500/50' :
    data.status === 'failed' ? 'border-fall/60' :
    'border-divider';

  const iconCls = data.status === 'pending' ? 'opacity-30' : 'opacity-100';

  return (
    <div className="relative" style={{ width: 110 }}>
      {/* Spinning conic-gradient border for active state — angle animated via @property so the element itself doesn't rotate (no corner sweep) */}
      {isActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] rounded-[14px]"
          style={{
            background:
              'conic-gradient(from var(--pd-border-angle), transparent 0deg, rgba(56,189,248,0.35) 60deg, rgb(56 189 248) 120deg, rgb(34 211 238) 160deg, rgba(34,211,238,0.35) 220deg, transparent 280deg, transparent 360deg)',
            animation: 'pd-border-spin 1.4s linear infinite',
          } as React.CSSProperties}
        />
      )}

      <div
        title={data.label}
        className={`relative flex flex-col items-center gap-1.5 rounded-xl border bg-surface p-2 ${wrapperCls} transition-colors`}
      >
        {data.handles.map((h, i) => (
          <Handle
            key={`${h.type}-${h.position}-${i}`}
            type={h.type}
            position={positionMap[h.position]}
            isConnectable={false}
            style={{ width: 1, height: 1, background: 'transparent', border: 'none' }}
          />
        ))}

        {/* Icon */}
        <div className={`h-10 w-10 flex items-center justify-center ${iconCls}`}>
          {data.iconSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.iconSrc} alt={data.label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-2xl select-none">{data.iconEmoji}</span>
          )}
        </div>

        {/* Active: optional cancel button (border spin handles the loading indication) */}
        {isActive && data.onCancel && (
          <button
            onClick={(e) => { e.stopPropagation(); data.onCancel?.(); }}
            className="rounded-md border border-fall/40 px-2 py-0.5 text-[10px] font-semibold text-fall hover:bg-fall/10 cursor-pointer bg-transparent transition-colors"
          >
            ✕ Cancel
          </button>
        )}

        {/* Success: result (path or link) */}
        {data.status === 'success' && data.result && (
          data.resultIsLink ? (
            <a
              href={data.result}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block w-full text-[9px] font-mono text-accent hover:underline break-all text-center line-clamp-2"
            >
              {data.result}
            </a>
          ) : (
            <p className="w-full text-[9px] font-mono text-primary break-all text-center line-clamp-2">
              {data.result}
            </p>
          )
        )}

        {/* Failed: retry */}
        {data.status === 'failed' && data.onRetry && (
          <button
            onClick={(e) => { e.stopPropagation(); data.onRetry?.(); }}
            className="rounded-md border border-divider px-2 py-0.5 text-[10px] font-semibold text-muted hover:text-primary hover:bg-divider/40 cursor-pointer bg-transparent transition-colors"
          >
            ↺ Retry
          </button>
        )}
      </div>
    </div>
  );
}

const flowNodeTypes = { pipeline: FlowPipelineNode };

function FlowCanvas({
  nodes,
  edges,
  nodesKey,
  onNodeClick,
  onPaneClick,
}: {
  nodes: Node[];
  edges: Edge[];
  nodesKey: string;
  onNodeClick: (id: string) => void;
  onPaneClick: () => void;
}) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    let resizeRaf = 0;
    const raf = requestAnimationFrame(() => {
      resizeRaf = requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 250 });
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
    };
  }, [nodesKey, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={flowNodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      minZoom={0.1}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_, node) => onNodeClick(node.id)}
      onPaneClick={onPaneClick}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(148, 163, 184, 0.22)" />
    </ReactFlow>
  );
}

function DetailField({ label, value, mono, link }: { label: string; value?: string | null; mono?: boolean; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline break-all">
          {value}
        </a>
      ) : (
        <span className={`text-[11px] text-primary break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: NodeStatus }) {
  const cls =
    status === 'active' ? 'bg-accent/15 text-accent' :
    status === 'success' ? 'bg-emerald-500/15 text-emerald-500' :
    status === 'failed' ? 'bg-fall/15 text-fall' :
    'bg-divider/40 text-muted';
  const label =
    status === 'active' ? 'Running' :
    status === 'success' ? 'Success' :
    status === 'failed' ? 'Failed' :
    'Pending';
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
}

type DetailPanelProps = {
  selectedNodeId: string | null;
  capturedImages: string[];
  captureStatus: NodeStatus;
  videoState: VideoState;
  renderNodeStatus: NodeStatus;
  publishStatus: NodeStatus;
  sixGateState: SixGateState;
  jobInfos: Record<string, JobInfo>;
  fbContent: string;
  onCancelRender?: () => void;
};

function DetailPanel({
  selectedNodeId,
  capturedImages,
  captureStatus,
  videoState,
  renderNodeStatus,
  publishStatus,
  sixGateState,
  jobInfos,
  fbContent,
  onCancelRender,
}: DetailPanelProps) {
  if (!selectedNodeId) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <div className="text-2xl opacity-40">◇</div>
        <p className="text-xs text-muted">Click any step to see its details.</p>
      </div>
    );
  }

  if (selectedNodeId === 'render') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <span className="text-base">🎬</span> Render Video
          </h3>
          <StatusBadge status={renderNodeStatus} />
        </div>
        <DetailField label="Endpoint" value="POST localhost:8010/api/zhihugen/render/upload" mono />
        {videoState.phase === 'rendering' && (
          <>
            <DetailField label="Job ID" value={videoState.jobId} mono />
            {videoState.cancelling && <DetailField label="State" value="Cancelling…" />}
            {onCancelRender && (
              <button
                onClick={onCancelRender}
                disabled={videoState.cancelling}
                className="self-start mt-1 rounded-md border border-fall/40 px-2.5 py-1 text-[11px] font-semibold text-fall hover:bg-fall/10 disabled:opacity-50 disabled:cursor-wait cursor-pointer bg-transparent transition-colors"
              >
                ✕ {videoState.cancelling ? 'Cancelling…' : 'Cancel render'}
              </button>
            )}
          </>
        )}
        {videoState.phase === 'completed' && (
          <>
            <DetailField label="Job ID" value={videoState.jobId} mono />
            <DetailField label="Output path" value={videoState.videoPath} mono />
          </>
        )}
        {videoState.phase === 'failed' && <DetailField label="Error" value={videoState.error} />}
      </div>
    );
  }

  if (selectedNodeId === 'publish') {
    const jobs = sixGateState.phase === 'submitted' ? sixGateState.jobs : [];
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <span className="text-base">📤</span> Publish
          </h3>
          <StatusBadge status={publishStatus} />
        </div>
        <DetailField label="Endpoint" value="POST localhost:20129/api/groups/{groupId}/upload-by-path" mono />
        <DetailField label="Group ID" value={SIXGATE_ACCOUNT_ID} mono />
        <DetailField label="Privacy" value="public" />
        <DetailField label="Destinations" value={jobs.length > 0 ? `${jobs.length}` : undefined} />
        {sixGateState.phase === 'failed' && <DetailField label="Error" value={sixGateState.error} />}
        {fbContent && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">Caption</span>
            <div className="rounded-md border border-divider bg-surface px-2 py-1.5 text-[11px] text-primary leading-relaxed whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {fbContent}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedNodeId.startsWith('job_')) {
    const jobId = selectedNodeId.slice(4);
    const jobs = sixGateState.phase === 'submitted' ? sixGateState.jobs : [];
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return <p className="text-xs text-muted">Job no longer available.</p>;
    const info = jobInfos[jobId];
    const nodeStatus: NodeStatus =
      !info || info.status === 'Created' ? 'pending' :
      info.status === 'Published' ? 'success' :
      info.status === 'Failed' || info.status === 'Cancelled' || info.status === 'ReconnectRequired' ? 'failed' :
      'active';
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{platformIcon(job.platform)}</span>
            <span className="truncate">{job.destinationName}</span>
          </h3>
          <StatusBadge status={nodeStatus} />
        </div>
        <DetailField label="Platform" value={job.platform} />
        <DetailField label="Destination ID" value={job.destinationId} mono />
        <DetailField label="Status" value={info?.status ?? 'Created'} mono />
        <DetailField label="Job ID" value={job.id} mono />
        <DetailField label="Job Details" value={job.jobDetailsLink} link />
        {info?.providerPostUrl && <DetailField label="Post URL" value={info.providerPostUrl} link />}
        {info?.errorMessage && <DetailField label="Error" value={info.errorMessage} />}
        {info?.status === 'ReconnectRequired' && (
          <p className="text-[11px] text-fall leading-relaxed">
            This account needs to be reconnected in the 6Gate app before retry.
          </p>
        )}
      </div>
    );
  }

  return null;
}


type Props = {
  blocks: PostBlock[];
  title: string;
  sourceLabel: string;
  postLanguage: PostLanguage;
  contentLang?: string;
  onClose: () => void;
};

type PostResult = { ok: true; url: string } | { ok: false; message: string } | null;

export function PostDialog({ blocks: initialBlocks, title, sourceLabel, postLanguage, contentLang, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('threads');
  const [editedBlocks, setEditedBlocks] = useState<PostBlock[]>(initialBlocks);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<PostResult>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>({ phase: 'idle' });
  const [sixGateState, setSixGateState] = useState<SixGateState>({ phase: 'idle' });
  const [jobInfos, setJobInfos] = useState<Record<string, JobInfo>>({});
  const [pollKey, setPollKey] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fbContent = formatFacebookPostFromBlocks(editedBlocks);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  function updateBlockText(idx: number, text: string) {
    setEditedBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, text } : b));
  }

  function deleteBlock(idx: number) {
    setEditedBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  const captureImages = useCallback(async (): Promise<string[]> => {
    setCapturing(true);
    setCapturedImages([]);
    try {
      const { toPng } = await import('html-to-image');
      const results: string[] = [];
      for (const el of groupRefs.current) {
        if (!el) continue;
        const dataUrl = await toPng(el, { pixelRatio: 2, skipFonts: true });
        results.push(dataUrl);
      }
      setCapturedImages(results);
      return results;
    } finally {
      setCapturing(false);
    }
  }, []);

  function getAudioScripts(blocks: PostBlock[]): string[] {
    const groups: { main: PostBlock; replies: PostBlock[] }[] = [];
    for (const b of blocks) {
      if (b.isReply && groups.length > 0) {
        groups[groups.length - 1].replies.push(b);
      } else {
        groups.push({ main: b, replies: [] });
      }
    }
    return groups.map((g) => [g.main, ...g.replies].map((b) => b.text).join('\n'));
  }

  function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  }

  async function renderVideo() {
    setVideoState({ phase: 'capturing' });
    let images = capturedImages;
    if (images.length === 0) {
      images = await captureImages();
    }
    if (images.length === 0) {
      setVideoState({ phase: 'failed', error: 'No images to render' });
      return;
    }
    try {
      const audioScripts = getAudioScripts(editedBlocks);
      const form = new FormData();
      form.append('videoTitle', title);
      images.forEach((dataUrl, i) => {
        form.append('images', dataUrlToFile(dataUrl, `scene-${i + 1}.png`));
      });
      audioScripts.forEach((script) => form.append('audioScripts', script));

      const res = await fetch('http://localhost:8010/api/zhihugen/render/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const { jobId } = await res.json() as { jobId: string };

      setVideoState({ phase: 'rendering', jobId });

      const waitRes = await fetch(`http://localhost:8010/api/zhihugen/jobs/${jobId}/wait`);
      const result = await waitRes.json() as { status: string; outputVideoPath?: string; error?: string };

      if (result.status === 'completed' && result.outputVideoPath) {
        setVideoState({ phase: 'completed', jobId, videoPath: result.outputVideoPath });
        postTo6Gate(result.outputVideoPath);
      } else if (result.status === 'cancelled') {
        setVideoState({ phase: 'failed', error: 'Render cancelled' });
      } else {
        setVideoState({ phase: 'failed', error: result.error ?? 'Job failed' });
      }
    } catch (err) {
      setVideoState({ phase: 'failed', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  async function postTo6Gate(videoPath: string) {
    setSixGateState({ phase: 'submitting' });
    try {
      const res = await fetch(`http://localhost:20129/api/groups/${SIXGATE_ACCOUNT_ID}/upload-by-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath, title, caption: fbContent, privacy: 'public' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `6Gate error ${res.status}`);
      }
      const data = await res.json() as { jobs: SixGateJob[] };
      setSixGateState({ phase: 'submitted', jobs: data.jobs });
    } catch (err) {
      setSixGateState({ phase: 'failed', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  function startVideoFlow() {
    const alreadyRunning = videoState.phase === 'capturing' || videoState.phase === 'rendering';
    setTab('video');
    if (!alreadyRunning) {
      setVideoState({ phase: 'idle' });
      setSixGateState({ phase: 'idle' });
      setJobInfos({});
      renderVideo();
    }
  }

  function retryRender() {
    setVideoState({ phase: 'idle' });
    setSixGateState({ phase: 'idle' });
    setJobInfos({});
    renderVideo();
  }

  async function cancelRender() {
    if (videoState.phase !== 'rendering' || videoState.cancelling) return;
    const jobId = videoState.jobId;
    setVideoState({ phase: 'rendering', jobId, cancelling: true });
    try {
      await fetch(`http://localhost:8010/api/zhihugen/jobs/${jobId}/cancel`, { method: 'POST' });
    } catch {
      // /wait will surface the final state
    }
  }

  function retryPublish() {
    if (videoState.phase !== 'completed') return;
    setSixGateState({ phase: 'idle' });
    setJobInfos({});
    postTo6Gate(videoState.videoPath);
  }

  async function retryJob(jobId: string) {
    try {
      await fetch(`http://localhost:20129/api/post-jobs/${jobId}/retry`, { method: 'POST' });
      setJobInfos((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
      setPollKey((k) => k + 1);
    } catch {
      // surface via next poll cycle
    }
  }

  useEffect(() => {
    if (tab === 'image') captureImages();
  }, [tab, captureImages]);

  // Auto-select the most "interesting" node when nothing is selected yet
  useEffect(() => {
    if (tab !== 'video' || selectedNodeId !== null) return;
    if (videoState.phase === 'capturing' || videoState.phase === 'rendering') setSelectedNodeId('render');
    else if (sixGateState.phase === 'submitting') setSelectedNodeId('publish');
    else if (sixGateState.phase === 'submitted') {
      const firstActive = sixGateState.jobs.find((j) => {
        const s = jobInfos[j.id]?.status;
        return s && s !== 'Published' && s !== 'Failed' && s !== 'Cancelled';
      });
      setSelectedNodeId(firstActive ? `job_${firstActive.id}` : 'publish');
    }
    else if (videoState.phase === 'completed') setSelectedNodeId('publish');
    else if (videoState.phase === 'failed') setSelectedNodeId('render');
  }, [tab, selectedNodeId, videoState, sixGateState, jobInfos]);

  // Stream live job status via SSE — one connection per submitted batch
  useEffect(() => {
    if (sixGateState.phase !== 'submitted') return;
    const jobIds = new Set(sixGateState.jobs.map((j) => j.id));
    const es = new EventSource('http://localhost:20129/api/post-jobs/stream');

    es.addEventListener('snapshot', (e) => {
      try {
        const all = JSON.parse((e as MessageEvent).data) as Array<{
          id: string;
          status: JobStatus;
          providerPostUrl: string | null;
          errorMessage: string | null;
        }>;
        setJobInfos((prev) => {
          const next = { ...prev };
          for (const j of all) {
            if (jobIds.has(j.id)) {
              next[j.id] = {
                status: j.status,
                providerPostUrl: j.providerPostUrl,
                errorMessage: j.errorMessage,
              };
            }
          }
          return next;
        });
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('status', (e) => {
      try {
        const ev = JSON.parse((e as MessageEvent).data) as {
          jobId: string;
          status: JobStatus;
          providerPostUrl?: string | null;
          errorMessage?: string | null;
        };
        if (!jobIds.has(ev.jobId)) return;
        setJobInfos((prev) => ({
          ...prev,
          [ev.jobId]: {
            status: ev.status,
            providerPostUrl: ev.providerPostUrl ?? prev[ev.jobId]?.providerPostUrl ?? null,
            errorMessage: ev.errorMessage ?? prev[ev.jobId]?.errorMessage ?? null,
          },
        }));
      } catch {
        // ignore parse errors
      }
    });

    return () => {
      es.close();
    };
  }, [sixGateState, pollKey]);

  async function postToFacebook() {
    setPosting(true);
    setPostResult(null);
    try {
      const res = await fetch('/api/reddit/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fbContent, imageUrl: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không đăng được lên Facebook');
      setPostResult({ ok: true, url: data.url ?? '' });
    } catch (err) {
      setPostResult({ ok: false, message: err instanceof Error ? err.message : 'Không đăng được lên Facebook' });
    } finally {
      setPosting(false);
    }
  }

  function downloadImage(dataUrl: string, idx: number) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `thread-${idx + 1}.png`;
    a.click();
  }

  const tabCls = (t: Tab) =>
    `px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer border-0 ${
      tab === t ? 'bg-accent text-white' : 'bg-transparent text-muted hover:text-primary'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleBackdrop}>
      <div className="flex w-[960px] max-w-[95vw] flex-col rounded-2xl bg-panel shadow-2xl max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-divider shrink-0" lang={contentLang}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold text-accent">{sourceLabel}</p>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                postLanguage === PostLanguage.Vietnamese
                  ? 'bg-[#DA251D]/15 text-[#DA251D]'
                  : 'bg-blue-500/15 text-blue-500'
              }`}>
                {postLanguage === PostLanguage.Vietnamese ? '🇻🇳 VI' : '🇬🇧 EN'}
              </span>
            </div>
            <p className="line-clamp-1 text-xs text-muted">{title}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => setTab('threads')} className={tabCls('threads')}>Threads</button>
            <button onClick={() => setTab('facebook')} className={tabCls('facebook')}>Facebook</button>
            <button onClick={() => setTab('edit')} className={tabCls('edit')}>Edit</button>
            <button onClick={() => setTab('image')} className={tabCls('image')}>Images</button>
            <button onClick={() => setTab('video')} className={tabCls('video')}>Video</button>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted hover:text-primary cursor-pointer bg-transparent border-0 text-lg leading-none ml-1">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4" lang={contentLang}>

          {/* ThreadsPreview: always mounted offscreen to keep groupRefs valid for image capture */}
          <div style={tab !== 'threads' ? { position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' } : {}}>
            <ThreadsPreview blocks={editedBlocks} groupRefs={groupRefs} />
          </div>

          {tab === 'facebook' && (
            <div className="rounded-xl border border-divider bg-surface overflow-hidden max-w-[520px] mx-auto">
              <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                <div className="h-9 w-9 shrink-0 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold select-none">
                  f
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-primary leading-tight">Your Page</p>
                  <p className="text-[11px] text-muted">Just now · 🌐</p>
                </div>
              </div>
              <div className="px-4 pb-3 text-[13px] text-primary leading-relaxed whitespace-pre-wrap break-words">
                {fbContent}
              </div>
              <div className="flex items-center justify-around border-t border-divider px-4 py-1.5">
                {['👍 Thích', '💬 Bình luận', '↗ Chia sẻ'].map((label) => (
                  <span key={label} className="text-[12px] font-semibold text-muted select-none">{label}</span>
                ))}
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <div className="flex flex-col gap-3 max-w-[520px] mx-auto">
              {editedBlocks.map((b, i) => {
                const label = b.isMain ? 'Bài viết' : b.isReply ? '↳ Trả lời' : 'Bình luận';
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">{label}</span>
                      <button
                        onClick={() => deleteBlock(i)}
                        className="text-[10px] font-semibold text-fall hover:opacity-70 cursor-pointer bg-transparent border-0 px-0 py-0"
                      >
                        ✕ Delete
                      </button>
                    </div>
                    <textarea
                      value={b.text}
                      onChange={(e) => updateBlockText(i, e.target.value)}
                      rows={b.isMain ? 6 : 3}
                      className="w-full rounded-md border border-divider bg-surface px-3 py-2 text-[13px] text-primary resize-y outline-none focus:border-accent"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'video' && (() => {
            // Per-node status derivation
            // Capture is folded into the Render node — its phase reads as 'active' too
            const captureStatus: NodeStatus =
              videoState.phase === 'idle' ? 'pending' :
              videoState.phase === 'capturing' ? 'active' :
              (videoState.phase === 'failed' && capturedImages.length === 0) ? 'failed' :
              'success';

            const renderNodeStatus: NodeStatus =
              videoState.phase === 'idle' ? 'pending' :
              videoState.phase === 'capturing' || videoState.phase === 'rendering' ? 'active' :
              videoState.phase === 'completed' ? 'success' :
              'failed';

            const publishStatus: NodeStatus =
              videoState.phase !== 'completed' ? 'pending' :
              sixGateState.phase === 'idle' || sixGateState.phase === 'submitting' ? 'active' :
              sixGateState.phase === 'submitted' ? 'success' :
              'failed';

            const jobs = sixGateState.phase === 'submitted' ? sixGateState.jobs : [];
            const nodesKey = [
              jobs.length,
              ...jobs.map((j) => {
                const info = jobInfos[j.id];
                return [
                  j.id,
                  info?.status ?? 'Created',
                  info?.providerPostUrl ?? '',
                  info?.errorMessage ?? '',
                ].join(':');
              }),
            ].join('|');

            const jobCount = jobs.length;
            const PUBLISH_Y = 140;
            const JOB_GAP = 120;
            const jobYStart = jobCount > 0 ? PUBLISH_Y - (jobCount - 1) * (JOB_GAP / 2) : PUBLISH_Y;

            const baseOpts = { draggable: false, selectable: false, deletable: false, connectable: false } as const;

            const renderCanCancel = videoState.phase === 'rendering' && !videoState.cancelling;

            const nodes: Node[] = [
              {
                id: 'render',
                type: 'pipeline',
                position: { x: 40, y: 0 },
                data: {
                  label: 'Render Video',
                  iconSrc: '/render-icon.png',
                  status: renderNodeStatus,
                  result: videoState.phase === 'completed' ? videoState.videoPath : null,
                  resultIsLink: false,
                  onCancel: renderCanCancel ? cancelRender : undefined,
                  onRetry: retryRender,
                  isSelected: selectedNodeId === 'render',
                  handles: [{ type: 'source', position: 'bottom' }],
                },
                ...baseOpts,
              },
              {
                id: 'publish',
                type: 'pipeline',
                position: { x: 40, y: PUBLISH_Y },
                data: {
                  label: 'Publish to 6Gate',
                  iconSrc: '/6gate-icon.png',
                  status: publishStatus,
                  onRetry: videoState.phase === 'completed' ? retryPublish : undefined,
                  isSelected: selectedNodeId === 'publish',
                  handles: [
                    { type: 'target', position: 'top' },
                    { type: 'source', position: 'right' },
                  ],
                },
                ...baseOpts,
              },
              ...jobs.map((job, i) => {
                const info = jobInfos[job.id];
                const jobNodeStatus: NodeStatus =
                  !info || info.status === 'Created' ? 'pending' :
                  info.status === 'Published' ? 'success' :
                  info.status === 'Failed' || info.status === 'Cancelled' || info.status === 'ReconnectRequired' ? 'failed' :
                  'active';
                const nodeKey = `job_${job.id}`;
                return {
                  id: nodeKey,
                  type: 'pipeline',
                  position: { x: 220, y: jobYStart + i * JOB_GAP },
                  data: {
                    label: job.destinationName,
                    iconSrc: job.destinationIcon,
                    iconEmoji: platformIcon(job.platform),
                    status: jobNodeStatus,
                    result: info?.status === 'Published' ? info.providerPostUrl : null,
                    resultIsLink: true,
                    onRetry: info?.status === 'Failed' ? () => retryJob(job.id) : undefined,
                    isSelected: selectedNodeId === nodeKey,
                    handles: [{ type: 'target', position: 'left' }],
                  },
                  ...baseOpts,
                } as Node;
              }),
            ];

            const edgeBase = {
              type: 'smoothstep' as const,
              style: { stroke: 'rgb(148 163 184 / 0.45)', strokeWidth: 1.5 },
            };
            const edges: Edge[] = [
              { id: 'e_ren_pub', source: 'render', target: 'publish', animated: publishStatus === 'active', ...edgeBase },
              ...jobs.map((job) => {
                const info = jobInfos[job.id];
                const jobActive = info && info.status !== 'Created' && info.status !== 'Published'
                  && info.status !== 'Failed' && info.status !== 'Cancelled' && info.status !== 'ReconnectRequired';
                return {
                  id: `e_pub_${job.id}`,
                  source: 'publish',
                  target: `job_${job.id}`,
                  animated: !!jobActive,
                  ...edgeBase,
                } as Edge;
              }),
            ];

            return (
              <div className="flex gap-4">
                {/* LEFT: read-only n8n-style canvas */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="rounded-xl border border-divider bg-surface/30 overflow-hidden" style={{ height: 380 }}>
                    <ReactFlowProvider>
                      <FlowCanvas
                        nodes={nodes}
                        edges={edges}
                        nodesKey={nodesKey}
                        onNodeClick={(id) => setSelectedNodeId(id)}
                        onPaneClick={() => setSelectedNodeId(null)}
                      />
                    </ReactFlowProvider>
                  </div>

                  {/* Footer actions under canvas */}
                  <div className="flex items-center justify-end gap-2 pt-3">
                    {videoState.phase === 'idle' && (
                      <button
                        onClick={renderVideo}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer transition-opacity"
                      >
                        ▶ Start
                      </button>
                    )}
                    {videoState.phase === 'completed' && (
                      <button
                        onClick={() => { setSelectedNodeId(null); setVideoState({ phase: 'idle' }); setSixGateState({ phase: 'idle' }); setJobInfos({}); renderVideo(); }}
                        className="text-[11px] text-muted hover:text-primary cursor-pointer bg-transparent border-0"
                      >
                        ↺ Run again
                      </button>
                    )}
                    {videoState.phase === 'failed' && (
                      <button
                        onClick={() => { setSelectedNodeId(null); setVideoState({ phase: 'idle' }); }}
                        className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT: detail side panel */}
                <div className="w-[340px] shrink-0 rounded-xl border border-divider bg-surface/40 p-4 self-start">
                  <DetailPanel
                    selectedNodeId={selectedNodeId}
                    capturedImages={capturedImages}
                    captureStatus={captureStatus}
                    videoState={videoState}
                    renderNodeStatus={renderNodeStatus}
                    publishStatus={publishStatus}
                    sixGateState={sixGateState}
                    jobInfos={jobInfos}
                    fbContent={fbContent}
                    onCancelRender={cancelRender}
                  />
                </div>
              </div>
            );
          })()}

          {tab === 'image' && (
            <div className="flex flex-col gap-4 max-w-[520px] mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{capturedImages.length} ảnh</span>
                <button
                  onClick={captureImages}
                  disabled={capturing}
                  className="rounded-md border border-divider bg-surface px-3 py-1 text-xs font-semibold text-muted hover:text-primary disabled:opacity-40 cursor-pointer transition-colors"
                >
                  {capturing ? 'Đang chụp...' : '↺ Chụp lại'}
                </button>
              </div>
              {capturing && (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: groupRefs.current.filter(Boolean).length || 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-xl animate-pulse bg-divider" />
                  ))}
                </div>
              )}
              {!capturing && capturedImages.map((src, i) => (
                <div key={i} className="group relative rounded-md overflow-hidden border border-divider">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Thread ${i + 1}`} className="w-full" />
                  <button
                    onClick={() => downloadImage(src, i)}
                    className="absolute top-2 right-2 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                  >
                    ↓ Tải xuống
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-divider shrink-0">
          <div className="text-xs min-w-0 mr-3">
            {postResult && !postResult.ok && (
              <span className="text-fall">{postResult.message}</span>
            )}
            {postResult?.ok && (
              <a href={postResult.url} target="_blank" rel="noreferrer" className="text-accent hover:underline font-semibold">
                Đã đăng lên Facebook →
              </a>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary cursor-pointer bg-transparent"
            >
              Đóng
            </button>
            <button
              onClick={postToFacebook}
              disabled={posting || !fbContent}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-wait cursor-pointer transition-opacity"
            >
              <FacebookIcon size={12} /> {posting ? 'Đang đăng...' : 'Đăng Facebook'}
            </button>
            <button
              onClick={startVideoFlow}
              disabled={videoState.phase === 'capturing' || videoState.phase === 'rendering'}
              className="rounded-lg border border-divider px-3 py-1.5 text-xs font-semibold text-muted hover:text-primary disabled:opacity-40 cursor-pointer bg-transparent transition-colors"
            >
              → Video
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
