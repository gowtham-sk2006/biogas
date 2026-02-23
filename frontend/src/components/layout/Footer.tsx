import { HiOutlineHeart } from 'react-icons/hi2';

export default function Footer() {
    return (
        <footer className="mt-12 py-6 border-t border-surface-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                    <span>Built with</span>
                    <HiOutlineHeart className="text-danger-400 text-sm" />
                    <span>by BioPlastic AI Team</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>YOLOv8 · FastAPI · React</span>
                    <span className="text-surface-600">|</span>
                    <span>v1.0.0</span>
                </div>
                <div className="flex items-center gap-4">
                    <a href="#" className="hover:text-text-primary transition-colors">Docs</a>
                    <a href="#" className="hover:text-text-primary transition-colors">API</a>
                    <a href="#" className="hover:text-text-primary transition-colors">GitHub</a>
                </div>
            </div>
        </footer>
    );
}
