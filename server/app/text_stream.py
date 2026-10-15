"""Separate model reasoning before any text reaches visitors or speech services."""
import re


class ReasoningFilter:
    tag = re.compile(r"<\s*(/?)\s*(think|analysis|reasoning)(?:\s[^>]*)?>", re.I)

    def __init__(self):
        self.pending = ""
        self.depth = 0

    def feed(self, text, final=False):
        self.pending += text
        visible = []
        while self.pending:
            match = self.tag.search(self.pending)
            if match:
                if not self.depth:
                    visible.append(self.pending[:match.start()])
                self.depth = max(0, self.depth - 1) if match[1] else self.depth + 1
                self.pending = self.pending[match.end():]
                continue
            # A tag may span arbitrary network chunks. Never emit its prefix early.
            start = self.pending.rfind("<")
            if not final and start >= 0 and len(self.pending) - start <= 256:
                if not self.depth:
                    visible.append(self.pending[:start])
                self.pending = self.pending[start:]
                break
            if not self.depth:
                visible.append(self.pending)
            self.pending = ""
        return "".join(visible)


class SentenceBuffer:
    def __init__(self, max_length=90):
        self.pending = ""
        self.max_length = max_length

    def feed(self, text, final=False):
        self.pending += text
        sentences = []
        while self.pending:
            match = re.search(r"[。！？!?；;\n]", self.pending)
            boundary = match.end() if match else None
            if boundary is None or boundary > self.max_length:
                if len(self.pending) < self.max_length:
                    break
                # Prefer a natural phrase boundary over cutting a long sentence.
                prefix = self.pending[:self.max_length]
                boundary = max(prefix.rfind("，"), prefix.rfind(","), prefix.rfind(" ")) + 1
                if boundary < 12:
                    boundary = self.max_length
            sentence, self.pending = self.pending[:boundary], self.pending[boundary:]
            sentence = self.clean(sentence)
            if sentence:
                sentences.append(sentence)
        if final and self.pending:
            sentence = self.clean(self.pending)
            self.pending = ""
            if sentence:
                sentences.append(sentence)
        return sentences

    @staticmethod
    def clean(text):
        text = re.sub(r"https?://\S+", "", text)
        text = re.sub(r"[*#`>|]", "", text)
        return text.strip()
