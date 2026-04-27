import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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
  spacer: {
    height: 5,
  },
});

function InlineText({ text, style }: { text: string; style: Style }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        )
      )}
    </Text>
  );
}

function buildContent(markdown: string) {
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  function flushBullets() {
    if (!bullets.length) return;
    nodes.push(
      <View key={key++}>
        {bullets.map((b, i) => (
          <View key={i} style={S.bulletRow}>
            <Text style={S.dash}>–</Text>
            <InlineText text={b} style={S.bulletContent} />
          </View>
        ))}
      </View>
    );
    bullets = [];
  }

  for (const line of markdown.split('\n')) {
    if (line.startsWith('# ')) {
      flushBullets();
      nodes.push(<Text key={key++} style={S.name}>{line.slice(2)}</Text>);
    } else if (line.startsWith('## ')) {
      flushBullets();
      nodes.push(<Text key={key++} style={S.section}>{line.slice(3)}</Text>);
    } else if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
    } else if (line.trim() === '') {
      flushBullets();
      nodes.push(<View key={key++} style={S.spacer} />);
    } else {
      flushBullets();
      nodes.push(<InlineText key={key++} text={line} style={S.paragraph} />);
    }
  }

  flushBullets();
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
