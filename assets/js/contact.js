/* Page-local intake: no form storage, analytics events, backend, or third-party calls. */
(() => {
  'use strict';
  const form = document.getElementById('contactForm');
  if (!form) return;

  const byId = id => document.getElementById(id);
  const product = byId('productType');
  const result = byId('emailResult');
  const recipient = 'bramapeters@outlook.com';
  // Mail clients have different limits. Be conservative, and never truncate the draft.
  const reliableMailtoLength = 1900;
  let mode = 'project';
  let preparedEmail = null;
  let attempted = false;

  function discardPreparedEmail() {
    preparedEmail = null;
    result.hidden = true;
    byId('requestPreview').value = '';
    byId('copyStatus').textContent = '';
  }

  function syncMode(announce = false) {
    mode = form.elements.enquiryMode.value;
    form.querySelectorAll('[data-mode]').forEach(section => {
      const inactive = section.dataset.mode !== mode;
      section.hidden = inactive;
      if (section.tagName === 'FIELDSET') section.disabled = inactive;
      section.querySelectorAll('input, select, textarea, button').forEach(control => {
        control.disabled = inactive;
      });
    });
    byId('submitLabel').textContent = mode === 'project' ? 'Prepare my request' : 'Prepare my enquiry';
    byId('submissionHelp').textContent = `Your email application will open with your ${mode === 'project' ? 'request' : 'message'} filled in. Simply review the details and press Send.`;
    byId('formErrors').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
    form.querySelectorAll('.intake-field-error').forEach(error => { error.hidden = true; });
    attempted = false;
    closePicker();
    discardPreparedEmail();
    if (announce) byId('modeAnnouncement').textContent = mode === 'project'
      ? 'Project request selected. Project details, contact information and optional address fields are available.'
      : 'General enquiry selected. Only your topic, message, name and email are required. Your project draft is kept while this page stays open.';
  }

  function syncPrice() {
    const option = product.selectedOptions[0];
    const price = option.dataset.price;
    byId('productPrice').textContent = price ? `${price} · EUR, including VAT` : 'Select a service to see its starting price.';
    byId('productPrice').classList.toggle('has-price', Boolean(price));
    form.querySelectorAll('.intake-service').forEach(card => {
      const selected = card.dataset.service === option.dataset.service;
      card.classList.toggle('is-selected', selected);
      card.querySelector('.intake-selected').hidden = !selected;
    });
  }
  product.addEventListener('change', syncPrice);

  // One shared country dataset, with distinct country identities even for shared prefixes.
  const callingCode = byId('countryCode');
  const addressCountry = byId('addressCountry');
  const countries = window.COUNTRY_CALLING_CODES;
  let callingCodeChosen = false;
  if (Array.isArray(countries)) {
    callingCode.replaceChildren();
    countries.forEach(({ code, display, country, flag }) => {
      const label = `${flag} ${country} (${display || code})`;
      const phoneOption = new Option(label, code, false, country === 'Netherlands');
      phoneOption.dataset.country = country;
      callingCode.add(phoneOption);
      addressCountry.add(new Option(label, country));
    });
    callingCode.addEventListener('change', () => { callingCodeChosen = true; });
    addressCountry.addEventListener('change', () => {
      if (callingCodeChosen || !addressCountry.value) return;
      const index = Array.from(callingCode.options).findIndex(option => option.dataset.country === addressCountry.value);
      if (index >= 0) callingCode.selectedIndex = index;
    });
  }

  // Snapshot of the published index.html cards, used only until/unless the live source loads.
  // Keep in sync when changing portfolio cards; scripts/check-contact.mjs verifies this list.
  const fallbackProjects = [
    { id: 'uwv-monitor', title: 'UWV Monitor Arbeid & Gezondheid', image: 'assets/img/ÙWV3.png', category: 'Data Analytics' },
    { id: 'lost-in-translation', title: 'Lost In Translation™', image: 'assets/img/lostintranslation.png', category: 'Web Development' },
    { id: 'lelibrambas', title: 'LELIBRAMBAS+ | Family Archive Streaming', image: 'assets/lelibrambas-plus/screenshots/03-home.webp', category: 'Web Development' },
    { id: 'tue-learning-dashboard', title: 'TU/e Learning Dashboard', image: 'assets/img/dashboard1.jpg', category: 'UX/UI-design' },
    { id: 'emotional-drone', title: "The 'Emotional' Drone", image: 'assets/img/BlueJay1.jpg', category: 'UX/UI-design' },
    { id: 'doula', title: 'Doula | UX/UI Case Study', image: 'assets/img/doula.png', category: 'UX/UI-design' },
    { id: 'vinobo', title: 'Vinobo', image: 'assets/img/vinobolarge.jpg', category: 'Web Development' },
    { id: 'spotify', title: 'Reimagining Spotify Podcasts', image: 'assets/img/spotifyfull.png', category: 'UX/UI-design' },
    { id: 'raspberries', title: 'Raspberries Shopping Assistant', image: 'assets/img/rodebjer.png', category: 'UX/UI-design' },
    { id: 'honeymoon', title: 'The Honeymoon Webshop', image: 'assets/img/honeymoon.jpg', category: 'Web Development' },
    { id: 'j-meijer', title: 'J. Meijer B.V. 40 Jaar', image: 'assets/img/jmeijer.jpg', category: 'Videography' }
  ];
  const picker = byId('portfolioPicker');
  const trigger = byId('similarProject');
  const listbox = byId('portfolioOptions');
  const selectedReference = byId('similarProjectValue');
  let projects = [];
  let selectedId = '';
  let activeIndex = 0;
  let typeahead = '';
  let typeaheadAt = 0;

  function referenceContent(project) {
    const content = document.createElement('span');
    content.className = 'intake-reference-content';
    if (project.image) {
      const img = document.createElement('img');
      img.className = 'intake-reference-image';
      img.src = project.image;
      img.alt = '';
      img.width = 52;
      img.height = 38;
      img.loading = 'lazy';
      // A missing thumbnail must not remove the project's accessible name.
      img.addEventListener('error', () => { img.hidden = true; });
      content.append(img);
    }
    const text = document.createElement('span');
    text.className = 'intake-reference-text';
    const title = document.createElement('span');
    title.className = 'intake-reference-name';
    title.textContent = project.title;
    text.append(title);
    if (project.category) {
      const category = document.createElement('span');
      category.className = 'intake-reference-category';
      category.textContent = project.category;
      text.append(category);
    }
    content.append(text);
    return content;
  }

  function showSelection() {
    const selected = projects.find(project => project.id === selectedId);
    selectedReference.value = selected?.id ? selected.title : '';
    byId('portfolioSelection').replaceChildren(selected?.id ? referenceContent(selected) : document.createTextNode('Choose a portfolio reference'));
    // A select-only combobox exposes both its label and its selected value.
    trigger.setAttribute('aria-labelledby', 'similarLabel portfolioSelection');
    Array.from(listbox.children).forEach((option, index) => {
      option.setAttribute('aria-selected', String(projects[index].id === selectedId));
    });
  }

  function renderProjects(items) {
    projects = [{ id: '', title: 'No portfolio reference' }, ...items];
    if (!projects.some(project => project.id === selectedId)) selectedId = '';
    listbox.replaceChildren();
    projects.forEach((project, index) => {
      const option = document.createElement('li');
      option.id = `portfolio-option-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(project.id === selectedId));
      option.append(referenceContent(project));
      option.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') event.preventDefault(); });
      option.addEventListener('click', () => chooseProject(index));
      listbox.append(option);
    });
    showSelection();
    if (!listbox.hidden) activate(Math.max(0, projects.findIndex(project => project.id === selectedId)));
  }

  function activate(index) {
    activeIndex = Math.max(0, Math.min(projects.length - 1, index));
    Array.from(listbox.children).forEach((option, i) => option.classList.toggle('is-active', i === activeIndex));
    const option = listbox.children[activeIndex];
    trigger.setAttribute('aria-activedescendant', option.id);
    // Scroll only the list, never the surrounding page.
    if (option.offsetTop < listbox.scrollTop) listbox.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > listbox.scrollTop + listbox.clientHeight) {
      listbox.scrollTop = option.offsetTop + option.offsetHeight - listbox.clientHeight;
    }
  }

  function openPicker() {
    listbox.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    activate(Math.max(0, projects.findIndex(project => project.id === selectedId)));
  }

  function closePicker() {
    listbox.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    typeahead = '';
  }

  function chooseProject(index) {
    selectedId = projects[index].id;
    showSelection();
    closePicker();
    trigger.focus({ preventScroll: true });
    discardPreparedEmail();
  }

  trigger.addEventListener('click', () => { if (listbox.hidden) openPicker(); else closePicker(); });
  trigger.addEventListener('keydown', event => {
    const open = !listbox.hidden;
    if (event.key === 'Tab') { closePicker(); return; }
    if (event.key === 'Escape') { if (open) event.preventDefault(); closePicker(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Enter' || event.key === ' ') {
        if (open) chooseProject(activeIndex); else openPicker();
        return;
      }
      if (!open) openPicker();
      if (event.key === 'ArrowDown') activate(activeIndex + 1);
      if (event.key === 'ArrowUp') activate(activeIndex - 1);
      if (event.key === 'Home') activate(0);
      if (event.key === 'End') activate(projects.length - 1);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!open) openPicker();
      const now = Date.now();
      typeahead = (now - typeaheadAt < 700 ? typeahead : '') + event.key.toLocaleLowerCase();
      typeaheadAt = now;
      const index = projects.findIndex(project => project.title.toLocaleLowerCase().startsWith(typeahead));
      if (index >= 0) activate(index);
    }
  });
  document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) closePicker(); });
  // Keep focus on the combobox during mouse/touch-generated clicks without blocking touch scrolling.
  listbox.addEventListener('mousedown', event => event.preventDefault());
  document.addEventListener('focusin', event => { if (!picker.contains(event.target)) closePicker(); });
  renderProjects(fallbackProjects);

  async function loadPublishedProjects() {
    try {
      const response = await fetch('index.html', { credentials: 'same-origin' });
      if (!response.ok) return;
      // A template is inert: homepage scripts, styles, iframes and assets never execute/load.
      const template = document.createElement('template');
      template.innerHTML = await response.text();
      const cards = template.content.querySelectorAll('.portfolio-grid .portfolio-card[data-project]');
      if (!cards.length) return;
      const seen = new Set();
      const items = [];
      for (const card of cards) {
        if (card.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"], .is-hidden, .portfolio-card--disabled, .disabled, [data-placeholder]')) continue;
        let ancestor = card;
        let hidden = false;
        while (ancestor) {
          if (ancestor.style.display === 'none' || ancestor.style.visibility === 'hidden') hidden = true;
          ancestor = ancestor.parentElement;
        }
        if (hidden || card.dataset.project === 'next-project') continue;
        const link = card.querySelector('.article-body a');
        const href = link?.getAttribute('href')?.trim();
        if (!href || href === '#' || /^javascript:/i.test(href) || /coming soon|unavailable/i.test(link.textContent)) continue;
        const title = card.querySelector('h2')?.textContent.trim().replace(/\s+/g, ' ');
        const src = card.querySelector('figure img')?.getAttribute('src');
        if (!title || !src || seen.has(card.dataset.project)) continue;
        const image = new URL(src, document.baseURI);
        if (image.origin !== window.location.origin) continue;
        seen.add(card.dataset.project);
        items.push({ id: card.dataset.project, title, image: image.href, category: (card.dataset.categories || '').split(',')[0].trim() });
      }
      renderProjects(items);
    } catch (_) {
      // Offline, file:// previews, and failed fetches retain the published snapshot.
    }
  }
  loadPublishedProjects();

  const validationGroups = Array.from(form.querySelectorAll('[data-validate]'));
  function controlsFor(group) {
    return group.tagName === 'FIELDSET' ? Array.from(group.querySelectorAll('input')) : [group];
  }
  validationGroups.forEach(group => {
    controlsFor(group).forEach((control, index) => { if (!control.id) control.id = `${control.name}-${index}`; });
  });

  function validateGroup(group) {
    const controls = controlsFor(group);
    let message = '';
    if (!controls[0].matches(':disabled')) {
      const value = group.tagName === 'FIELDSET' ? controls.find(control => control.checked)?.value : controls[0].value.trim();
      if (!value) message = group.dataset.requiredMessage;
      else if (controls[0].type === 'email' && controls[0].validity.typeMismatch) message = 'Enter a valid email address, such as you@example.com.';
    }
    const error = byId(group.dataset.error);
    error.textContent = message;
    error.hidden = !message;
    controls.forEach(control => {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    });
    return message ? { message, control: controls[0] } : null;
  }

  function updateErrorSummary(errors) {
    const summary = byId('formErrors');
    summary.hidden = !errors.length;
    const state = errors.map(({ message, control }) => `${control.id}:${message}`).join('\n');
    // Do not make a screen reader repeat the same alert on every keystroke.
    if (summary.dataset.errors === state) return;
    summary.dataset.errors = state;
    summary.replaceChildren();
    if (!errors.length) return;
    const heading = document.createElement('p');
    heading.textContent = `A few details still need your attention (${errors.length}).`;
    const list = document.createElement('ul');
    errors.forEach(({ message, control }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${control.id}`;
      link.textContent = message;
      link.addEventListener('click', event => { event.preventDefault(); control.focus(); });
      item.append(link);
      list.append(item);
    });
    summary.append(heading, list);
  }

  form.addEventListener('focusout', event => {
    const group = event.target.closest('[data-validate]');
    if (group && !group.contains(event.relatedTarget)) validateGroup(group);
  });
  form.addEventListener('input', event => {
    if (event.target.closest('#emailResult')) return;
    discardPreparedEmail();
    const group = event.target.closest('[data-validate]');
    if (group && (attempted || !byId(group.dataset.error).hidden)) validateGroup(group);
    if (attempted) updateErrorSummary(validationGroups.map(validateGroup).filter(Boolean));
  });
  form.addEventListener('change', event => {
    if (event.target.name === 'enquiryMode') syncMode(true);
    else discardPreparedEmail();
    if (attempted) updateErrorSummary(validationGroups.map(validateGroup).filter(Boolean));
  });

  function prepareEmail() {
    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    const phone = value('phone');
    const fullPhone = phone ? (phone.startsWith('+') ? phone : `${value('countryCode')} ${phone}`) : '';
    const section = (heading, fields) => {
      const populated = fields.filter(([, text]) => text);
      return populated.length ? [heading, '', ...populated.flatMap(([label, text]) => [`${label}:`, text, ''])].join('\n') : '';
    };
    const client = [['Name', value('name')], ['Email', value('email')], ['Phone', fullPhone]];
    let subject;
    let sections;
    if (mode === 'project') {
      subject = `Bram Peters Studio — Project Request — ${value('productType')}`;
      sections = [
        'BRAM PETERS STUDIO\nPROJECT REQUEST\n',
        section('PROJECT', [
          ['Product type', value('productType')], ['Starting price shown', product.selectedOptions[0].dataset.price],
          ['Project title', value('projectTitle')], ['Similar to', value('similarProject')]
        ]),
        section('CLIENT', [...client, ['Client type', value('clientType')]]),
        section('ADDRESS', [['Street', value('street')], ['Number', value('number')], ['Postal code', value('postalCode')], ['Country', value('country')]]),
        section('PROJECT REQUIREMENTS', [['Brand guidelines', value('brandGuidelines')], ['Description', value('projectDescription')], ['Additional information', value('additionalInformation')]])
      ];
    } else {
      subject = `Bram Peters Studio — General Enquiry — ${value('generalTopic')}`;
      sections = ['BRAM PETERS STUDIO\nGENERAL ENQUIRY\n',
        section('ENQUIRY', [['Topic', value('generalTopic')], ['Subject', value('generalTitle')]]),
        section('CONTACT', client), section('MESSAGE', [['Message', value('generalMessage')]])];
    }
    const body = [...sections.filter(Boolean), '---\nSubmitted via bram-peters.com/contact.html'].join('\n').replace(/\r?\n/g, '\r\n');
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { mailto, copy: `To: ${recipient}\r\nSubject: ${subject}\r\n\r\n${body}` };
  }

  function openEmailApplication() {
    if (!preparedEmail) return;
    byId('resultTitle').textContent = 'Almost there!';
    byId('resultMessage').textContent = `Your email application should now open. Review your ${mode === 'project' ? 'request' : 'message'} and press Send to submit it.`;
    try {
      // Do not put a personal mailto URL in the DOM where automatic link tracking can read it.
      window.location.href = preparedEmail.mailto;
    } catch (_) {
      byId('resultMessage').textContent = 'Your browser could not open an email application. Copy the request below and paste it into a new email.';
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    attempted = true;
    const errors = validationGroups.map(validateGroup).filter(Boolean);
    updateErrorSummary(errors);
    if (errors.length) {
      discardPreparedEmail();
      errors[0].control.focus();
      return;
    }
    preparedEmail = prepareEmail();
    byId('requestPreview').value = preparedEmail.copy;
    byId('copyStatus').textContent = '';
    byId('manualCopy').open = false;
    const tooLong = preparedEmail.mailto.length > reliableMailtoLength;
    byId('longRequestWarning').hidden = !tooLong;
    byId('openEmailAgain').textContent = tooLong ? 'Open email application anyway' : 'Open email application again';
    result.hidden = false;
    if (tooLong) {
      byId('resultTitle').textContent = 'Your request is ready.';
      byId('resultMessage').textContent = 'Use the copy option to keep every detail in your email, then review it and press Send.';
    } else {
      openEmailApplication();
    }
    byId('resultTitle').focus();
  });

  byId('openEmailAgain').addEventListener('click', openEmailApplication);
  byId('copyRequest').addEventListener('click', async () => {
    if (!preparedEmail) return;
    const draft = preparedEmail;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(draft.copy);
      if (preparedEmail === draft) byId('copyStatus').textContent = 'Copied, including the recipient and subject. Paste it into your email application and review it before sending.';
    } catch (_) {
      if (preparedEmail !== draft) return;
      byId('manualCopy').open = true;
      const preview = byId('requestPreview');
      preview.focus();
      preview.select();
      preview.setSelectionRange(0, preview.value.length);
      byId('copyStatus').textContent = 'Automatic copying is unavailable. Your complete request is selected below. Use Copy from your device’s menu, or press Ctrl+C / ⌘C.';
    }
  });

  syncMode();
  syncPrice();
  byId('prepareRequest').disabled = false;
})();
