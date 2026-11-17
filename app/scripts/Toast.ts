/**
 * A short message in the page (video download, beta). Used only for failures of video download.
 * In a shadow root so that X's styles and ours do not affect each other.
 */
const hostId: string = 'twitter-image-dl-toast';
const visibleMs: number = 4000;

let hideTimer: number | undefined = undefined;

const css: string = `
:host { all: initial; }
.toast {
	position: fixed;
	left: 50%;
	bottom: 32px;
	transform: translateX(-50%);
	z-index: 2147483647;
	max-width: min(560px, calc(100vw - 32px));
	box-sizing: border-box;
	padding: 12px 16px;
	border-radius: 8px;
	background: rgba(15, 20, 25, 0.92);
	color: #ffffff;
	font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	pointer-events: none;
	transition: opacity 0.2s;
}
.title { font-weight: bold; margin-right: 6px; }
`;

export function showToast(message: string): void {
	const previous = document.getElementById(hostId);
	if (previous !== null) previous.remove();
	if (hideTimer !== undefined) window.clearTimeout(hideTimer);

	const host = document.createElement('div');
	host.id = hostId;
	const root = host.attachShadow({ mode: 'closed' });

	const style = document.createElement('style');
	style.textContent = css;
	const toast = document.createElement('div');
	toast.className = 'toast';
	toast.setAttribute('role', 'status');
	toast.setAttribute('aria-live', 'polite');
	const title = document.createElement('span');
	title.className = 'title';
	title.textContent = 'Twitter Image Downloader:';
	const text = document.createElement('span');
	text.textContent = message;
	toast.appendChild(title);
	toast.appendChild(text);
	root.appendChild(style);
	root.appendChild(toast);
	(document.body || document.documentElement).appendChild(host);

	hideTimer = window.setTimeout(() => {
		toast.style.opacity = '0';
		window.setTimeout(() => host.remove(), 300);
		hideTimer = undefined;
	}, visibleMs);
}
