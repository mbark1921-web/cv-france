(() => {
  const button = document.getElementById('pdfBtn');
  if (!button) return;
  const byId = id => document.getElementById(id);
  const value = id => String(byId(id)?.value || '').trim();
  const status = document.createElement('div');
  status.id = 'pdfExportStatus'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  button.insertAdjacentElement('afterend', status);
  let loading, busy = false, lastUrl;
  const copy = () => document.documentElement.lang === 'ar' ? {
    busy: 'جارٍ إنشاء PDF…', ready: 'ملف PDF جاهز.', download: 'تنزيل PDF',
    failed: 'تعذر إنشاء PDF. تحقق من الاتصال ثم أعد المحاولة.', empty: 'أضف محتوى إلى السيرة الذاتية أولاً.'
  } : { busy: 'Génération du PDF…', ready: 'PDF prêt.', download: 'Télécharger le PDF',
    failed: 'Impossible de générer le PDF. Vérifiez la connexion puis réessayez.', empty: 'Ajoutez du contenu au CV avant de l’exporter.' };
  function binary(buffer) {
    const bytes = new Uint8Array(buffer); let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  async function assets() {
    if (!loading) loading = (async () => {
      if (!window.jspdf) await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => { script.remove(); reject(new Error('PDF library timeout')); }, 15000);
        script.src = '/vendor/pdf/jspdf.umd.min.js';
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('PDF library unavailable')); };
        document.head.appendChild(script);
      });
      const fonts = await Promise.all(['Regular', 'Bold'].map(async weight => {
        const response = await fetch('/vendor/pdf/Amiri-' + weight + '.ttf', { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('PDF font unavailable');
        return binary(await response.arrayBuffer());
      }));
      return { PDF: window.jspdf.jsPDF, fonts };
    })().catch(error => { loading = undefined; throw error; });
    return loading;
  }
  function snapshot() {
    window.updateCvPreview?.();
    return {
      title: value('cvTitle'), name: value('cvFullName'), role: value('cvRole'),
      contacts: [value('cvEmail'), value('cvPhone'), value('cvAddress')].filter(Boolean),
      sections: ['cvProfile', 'cvExperience', 'cvSkills', 'cvEducation', 'cvLanguages'].map(value),
      ar: value('cvLanguage') === 'ar', template: value('cvTemplate'),
      color: /^#[0-9a-f]{6}$/i.test(value('cvCustomColor')) ? value('cvCustomColor') : '#111827',
      photo: byId('cvPreview')?.querySelector('.cv-photo-preview')?.getAttribute('src') || ''
    };
  }
  function generate(data, { PDF, fonts }) {
    const pdf = new PDF({ unit: 'mm', format: 'a4', compress: true });
    ['normal', 'bold'].forEach((style, i) => {
      pdf.addFileToVFS('Amiri-' + style + '.ttf', fonts[i]);
      pdf.addFont('Amiri-' + style + '.ttf', 'Amiri', style);
    });
    pdf.setFont('Amiri'); pdf.setLanguage(data.ar ? 'ar' : 'fr');
    pdf.setProperties({ title: data.title || data.name || 'CV', creator: 'Jovelya' });
    const pro = data.template.startsWith('pro-');
    const darkSide = ['pro-coral', 'pro-graphite'].includes(data.template);
    const darkHeader = ['pro-ocean', 'pro-graphite'].includes(data.template);
    const labels = data.ar ? ['الملف المهني', 'الخبرات', 'المهارات', 'الدراسة والتكوين', 'اللغات']
      : ['Profil professionnel', 'Expériences', 'Compétences', 'Formation / Études', 'Langues'];
    const clean = s => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    function text(line, x, y, width, size = 11, bold = false, color = '#18212f', rtl = data.ar) {
      pdf.setFont('Amiri', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(color);
      // jsPDF's Arabic shaping/Bidi engine already orders the glyphs. setR2L(true)
      // would reverse that visual order a second time and disconnect the letters.
      pdf.setR2L(false); pdf.text(clean(line), rtl ? x + width : x, y, { align: rtl ? 'right' : 'left' });
    }
    function wrap(content, width, size = 11, bold = false) {
      pdf.setFont('Amiri', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
      return pdf.splitTextToSize(clean(content), width);
    }
    function decorate(page) {
      pdf.setFillColor(data.color);
      if (data.template === 'modern') pdf.rect(data.ar ? 205 : 0, 0, 5, 297, 'F');
      else pdf.rect(0, 0, 210, data.template === 'pro-slate' ? 5 : 2, 'F');
      if (pro) {
        pdf.setFillColor(darkSide ? data.color : '#eef2f6');
        pdf.rect(data.ar ? 137 : 0, page === 1 ? headerEnd : 20, 73, 277 - (page === 1 ? headerEnd : 20), 'F');
      }
      if (page > 1) text(data.name || (data.ar ? 'السيرة الذاتية' : 'Curriculum vitae'), 15, 13, 180, 11, true, data.color);
    }
    // Measure the header before painting; long names and contacts must not overlap the body.
    const title = data.name || (data.ar ? 'سيرتي الذاتية' : 'Mon CV');
    const hasPhoto = /^data:image\/(png|jpeg|webp);base64,/.test(data.photo);
    const headerWidth = hasPhoto ? 145 : 180;
    const nameLines = wrap(title, headerWidth, 22, true);
    const roleLines = data.role ? wrap(data.role, headerWidth, 13) : [];
    const contactLines = data.contacts.flatMap(contact => wrap(contact, headerWidth, 10));
    const headerEnd = Math.max(hasPhoto ? 51 : 25, 13 + nameLines.length * 9 + roleLines.length * 6 + contactLines.length * 5 + 9);
    if (headerEnd > 180) throw new Error('PDF header too long');
    decorate(1);
    if (darkHeader) { pdf.setFillColor(data.template === 'pro-graphite' ? '#30343b' : data.color); pdf.rect(0, 2, 210, headerEnd - 2, 'F'); }
    const headerX = hasPhoto && data.ar ? 50 : 15;
    let y = 17;
    nameLines.forEach(line => { text(line, headerX, y, headerWidth, 22, true, darkHeader ? '#ffffff' : data.color); y += 9; });
    roleLines.forEach(line => { text(line, headerX, y, headerWidth, 13, false, darkHeader ? '#ffffff' : '#18212f'); y += 6; });
    contactLines.forEach(line => { text(line, headerX, y, headerWidth, 10, false, darkHeader ? '#ffffff' : '#475467', /[\u0600-\u06ff]/.test(line)); y += 5; });
    if (hasPhoto) pdf.addImage(data.photo, data.ar ? 15 : 165, 10, 28, 28);
    function flow(indices, x, width, side = false) {
      let page = 1, y = headerEnd + 10;
      const color = side && darkSide ? '#ffffff' : '#18212f';
      function advance(needed) {
        if (y + needed <= 277) return;
        page++; if (page > 30) throw new Error('PDF too long');
        if (pdf.getNumberOfPages() < page) { pdf.addPage(); decorate(page); } else pdf.setPage(page);
        y = 28;
      }
      for (const index of indices) {
        if (!data.sections[index]) continue;
        const heading = wrap(labels[index], width, 12, true);
        advance(heading.length * 6 + 6);
        heading.forEach(line => { text(line, x, y, width, 12, true, side && darkSide ? '#ffffff' : data.color); y += 6; });
        pdf.setDrawColor(side && darkSide ? '#ffffff' : data.color); pdf.line(x, y - 3, x + width, y - 3);
        for (const line of wrap(data.sections[index], width)) { advance(5); text(line, x, y, width, 11, false, color); y += 5; }
        y += 6;
      }
    }
    if (pro) { flow([0, 2, 4], data.ar ? 144 : 10, 56, true); pdf.setPage(1); flow([1, 3], data.ar ? 12 : 83, 115); }
    else flow([0, 1, 2, 3, 4], 15, 180);
    for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
      pdf.setPage(page); text(page + ' / ' + pdf.getNumberOfPages(), 15, 288, 180, 9, false, '#64748b', false);
    }
    return pdf.output('blob');
  }
  async function exportPdf() {
    if (busy) return;
    const data = snapshot();
    if (![data.name, data.role, ...data.sections, ...data.contacts].some(Boolean)) { status.textContent = copy().empty; return; }
    busy = true; button.disabled = true; button.setAttribute('aria-busy', 'true'); status.textContent = copy().busy;
    try {
      const blob = generate(data, await assets());
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = lastUrl;
      link.download = (data.title || data.name || 'CV').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-').slice(0, 100) + '.pdf';
      link.textContent = copy().download; link.style.marginInlineStart = '.5em';
      status.replaceChildren(document.createTextNode(copy().ready), link);
      link.click();
    } catch { status.textContent = copy().failed; }
    finally { busy = false; button.disabled = false; button.removeAttribute('aria-busy'); }
  }
  // This final binding replaces every legacy window.print wrapper, including professional templates.
  window.printCvPreview = exportPdf;
  button.removeAttribute('onclick'); button.onclick = exportPdf;
})();
