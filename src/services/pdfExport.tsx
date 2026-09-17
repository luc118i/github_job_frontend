import { pdf, Document, Page, Text, View, Link, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    paddingVertical: 44,
    paddingHorizontal: 52,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#000',
    marginBottom: 4,
  },
  section: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#555',
    borderBottomWidth: 0.5,
    borderBottomColor: '#bbb',
    paddingBottom: 3,
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10.5,
    color: '#333',
    lineHeight: 1.5,
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  dash: {
    width: 14,
    color: '#777',
    fontSize: 10.5,
  },
  bulletContent: {
    flex: 1,
    fontSize: 10.5,
    color: '#333',
    lineHeight: 1.5,
  },
  entryGroup: {
    marginBottom: 8,
  },
});

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

/** Quebra uma linha em segmentos texto / **negrito** / [rótulo](link). */
function splitInline(text: string): { text: string; bold?: boolean; href?: string }[] {
  const segments: { text: string; bold?: boolean; href?: string }[] = [];
  let lastIndex = 0;
  const combined = new RegExp(`${LINK_RE.source}|${BOLD_RE.source}`, 'g');
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text))) {
    if (m.index > lastIndex) segments.push({ text: text.slice(lastIndex, m.index) });
    if (m[1] !== undefined) segments.push({ text: m[1], href: m[2] });
    else segments.push({ text: m[3], bold: true });
    lastIndex = combined.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}

function InlineText({ text, style }: { text: string; style: Style }) {
  const segments = splitInline(text);
  return (
    <Text style={style}>
      {segments.map((s, i) =>
        s.href ? (
          <Link key={i} src={s.href} style={{ color: '#3d72c8' }}>
            {s.text}
          </Link>
        ) : s.bold ? (
          <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>
            {s.text}
          </Text>
        ) : (
          s.text
        )
      )}
    </Text>
  );
}

// Agrupa cada entrada (parágrafo + seus bullets, delimitada por linha em
// branco) num View não-quebrável — evita título/empresa separado de suas
// bullets por uma quebra de página, sem travar a seção inteira numa página só.
function buildContent(markdown: string) {
  const nodes: React.ReactNode[] = [];
  let group: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  function flushBulletsIntoGroup() {
    if (!bullets.length) return;
    group.push(
      <View key={key++}>
        {bullets.map((b, i) => (
          <View key={i} style={S.bulletRow} wrap={false}>
            <Text style={S.dash}>–</Text>
            <InlineText text={b} style={S.bulletContent} />
          </View>
        ))}
      </View>
    );
    bullets = [];
  }

  function flushGroup() {
    flushBulletsIntoGroup();
    if (!group.length) return;
    nodes.push(<View key={key++} style={S.entryGroup} wrap={false}>{group}</View>);
    group = [];
  }

  for (const line of markdown.split('\n')) {
    if (line.startsWith('# ')) {
      flushGroup();
      nodes.push(<Text key={key++} style={S.name}>{line.slice(2)}</Text>);
    } else if (line.startsWith('## ')) {
      flushGroup();
      // minPresenceAhead: nunca deixa o título de seção sozinho no fim da página.
      nodes.push(<Text key={key++} style={S.section} minPresenceAhead={50}>{line.slice(3)}</Text>);
    } else if (line.startsWith('- ')) {
      const item = line.slice(2).trim();
      if (item) bullets.push(item); // ignora bullets vazios ("- " sem texto)
    } else if (line.trim() === '') {
      flushGroup();
    } else {
      flushBulletsIntoGroup();
      group.push(<InlineText key={key++} text={line} style={S.paragraph} />);
    }
  }

  flushGroup();
  return nodes;
}

export async function downloadCvPdf(
  markdown: string,
  jobTitle: string,
  company: string
): Promise<void> {
  const filename = `CV - ${jobTitle} @ ${company}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');

  const doc = (
    <Document>
      <Page size="A4" style={S.page}>
        <View>
          {buildContent(markdown)}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
