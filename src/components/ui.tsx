import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, ArrowRight, BookOpen, Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { StudySet } from "../core/types";
const ToastContext = createContext<(text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3600);
      return () => clearTimeout(id);
    }
  }, [toast]);
  return (
    <ToastContext.Provider value={setToast}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={"logo " + (small ? "logo-small" : "")}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect
          x="3"
          y="8"
          width="23"
          height="20"
          rx="5"
          fill="currentColor"
          opacity=".25"
        />
        <path
          d="M12 3h13a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4"
          fill="currentColor"
        />
        <path
          d="m14 13 3 3 6-7"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!small && <span>StudyFlow</span>}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    const el = ref.current;
    const focusable = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>(
          "button, input, textarea, select, a[href]",
        ) ?? [],
      ).filter(
        (e) => !e.hasAttribute("disabled") && e.getClientRects().length > 0,
      );
    focusable()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = focusable();
        if (e.shiftKey && document.activeElement === all[0]) {
          e.preventDefault();
          all[all.length - 1]?.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === all[all.length - 1]
        ) {
          e.preventDefault();
          all[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      prior?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="row between">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Confirm({
  title,
  detail,
  onConfirm,
  onClose,
}: {
  title: string;
  detail: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">{detail}</p>
      <div className="row end gap">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
export function Empty({
  title,
  description,
  action,
  href = "/create",
}: {
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && (
        <Link to={href} className="button primary">
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function SetCard({ set, mode }: { set: StudySet; mode?: string }) {
  return (
    <Link className="set-card" to={"/set/" + set.id + (mode ? "/" + mode : "")}>
      <div className="set-card-meta">
        <span>{set.cards.length} Terms</span>
        <i />
        <span className="avatar tiny" style={{ background: set.color }}>
          {set.sample ? <BookOpen size={12} /> : "S"}
        </span>
        <span>{set.sample ? "StudyFlow originals" : "Your study set"}</span>
        {set.sample && <span className="sample-label">Starter set</span>}
      </div>
      <h3>{set.title}</h3>
    </Link>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
