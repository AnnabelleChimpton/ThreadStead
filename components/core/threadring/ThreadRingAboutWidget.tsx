import { MarkdownWithEmojis } from '@/lib/comment-markup';

interface ThreadRingAboutWidgetProps {
    description?: string | null;
    curatorNote?: string | null;
    className?: string;
}

export default function ThreadRingAboutWidget({
    description,
    curatorNote,
    className = ""
}: ThreadRingAboutWidgetProps) {
    if (!description && !curatorNote) return null;

    return (
        <div className={`bg-thread-paper rounded-cozy shadow-cozy p-4 border border-[#D4C4A8] ${className}`}>
            <h3 className="font-header font-bold text-lg text-thread-pine mb-3 flex items-center gap-2">
                <span>About this Ring</span>
            </h3>

            {description && (
                <div className="prose prose-sm prose-p:text-thread-sage prose-a:text-thread-pine prose-a:font-semibold max-w-none mb-4">
                    <MarkdownWithEmojis markdown={description} />
                </div>
            )}

            {curatorNote && (
                <div className="mt-4 pt-4 border-t border-[#D4C4A8]/50">
                    <h4 className="font-bold text-sm text-[#2E4B3F] mb-2 flex items-center gap-1">
                        <span>📝 Curator&apos;s Note</span>
                    </h4>
                    <div className="prose prose-sm prose-p:text-thread-sage prose-a:text-thread-pine prose-a:font-semibold max-w-none bg-[#F5F1E6] p-3 rounded-md border border-[#D4C4A8]/30">
                        <MarkdownWithEmojis markdown={curatorNote} />
                    </div>
                </div>
            )}
        </div>
    );
}
