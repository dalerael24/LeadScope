"use strict";

const state = {
  lead: {},
  sources: [],
  contacts: [],
  candidates: [],
  primaryCandidate: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const clean = value => String(value || "").trim();
const unknown = value => clean(value) || "Unknown - needs verification";
const today = () => {
  const date = new Date();
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function goTo(view) {
  $$(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
  $$(".step").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  window.scrollTo({ top: $(".workflow").offsetTop - 80, behavior: "smooth" });
  if (view === "brief") renderReport();
}

function readLeadForm() {
  state.lead = {
    fullName: clean($("#fullName").value), jobTitle: clean($("#jobTitle").value),
    company: clean($("#company").value), location: clean($("#location").value),
    industry: clean($("#industry").value), linkedinUrl: clean($("#linkedinUrl").value),
    knownDetails: clean($("#knownDetails").value), purpose: clean($("#purpose").value),
    compliant: $("#compliance").checked
  };
  return state.lead;
}

function validateSetup() {
  const lead = readLeadForm();
  $$("#leadForm input, #leadForm textarea").forEach(el => el.classList.remove("invalid"));
  const missing = [];
  if (!lead.fullName) { missing.push("full name"); $("#fullName").classList.add("invalid"); }
  if (!lead.purpose) { missing.push("research purpose"); $("#purpose").classList.add("invalid"); }
  if (!lead.compliant) missing.push("compliance confirmation");
  $("#setupMessage").textContent = missing.length ? `Please complete: ${missing.join(", ")}.` : "";
  return !missing.length;
}

function buildQueries() {
  const l = state.lead;
  const person = `"${l.fullName}"`;
  const company = l.company ? `"${l.company}"` : "company";
  const title = l.jobTitle ? `"${l.jobTitle}"` : "";
  const queries = [
    ["Identity", `${person} ${company} LinkedIn`],
    ["Role", `${person} ${title} ${company}`],
    ["News", `${person} ${company} press release OR news`],
    ["Leadership", `${company} executives leadership team`],
    ["Company signal", `${company} expansion OR locations OR real estate`],
    ["Interviews", `${person} ${company} interview OR conference OR podcast`],
    ["Official contact", `${company} official contact directory`],
    ["Public business email", `${person} ${company} public business email official`],
    ["Email evidence", `${company} press release email contact`],
    ["Filings", `${company} annual report OR investor relations`]
  ].filter(([, query]) => !query.includes('""'));
  $("#queryTarget").textContent = [l.fullName, l.company].filter(Boolean).join(" / ");
  $("#queryList").classList.remove("empty-state");
  $("#queryList").innerHTML = queries.map(([label, query]) => `
    <div class="query-row"><code><span class="quality-badge quality-high">${escapeHtml(label)}</span> ${escapeHtml(query)}</code>
    <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">Search ↗</a></div>`).join("");
}

function sourceAge(date) {
  if (!date) return { stale: true, label: "Date missing" };
  const age = (Date.now() - new Date(`${date}T00:00:00`).getTime()) / 31557600000;
  return { stale: age > 2, label: age > 2 ? "Older than 2 years" : `Dated ${date}` };
}

function qualityFor(type) {
  const high = ["Official company website", "Official LinkedIn", "Official press release", "Regulator or company filing", "Verified conference bio"];
  const medium = ["Reputable news", "Trade publication", "Event page", "Podcast or interview", "Professional association"];
  return high.includes(type) ? "High" : medium.includes(type) ? "Medium" : "Low";
}

const sourceTypes = ["Official company website", "Official LinkedIn", "Official press release", "Regulator or company filing", "Verified conference bio", "Reputable news", "Trade publication", "Event page", "Podcast or interview", "Professional association", "Old directory or copied bio"];
const contactTypes = ["Official contact page", "Official inquiry form", "Official staff directory", "LinkedIn or professional profile", "Verified public business email", "Unverified corporate email pattern"];

function field(label, name, type = "text", value = "", wide = false, options = []) {
  const control = type === "textarea" ? `<textarea name="${name}" rows="3">${escapeHtml(value)}</textarea>` : type === "select" ? `<select name="${name}">${options.map(v => `<option${v === value ? " selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select>` : `<input name="${name}" type="${type}" value="${escapeHtml(value)}"${type === "url" ? ' placeholder="https://..."' : ""}>`;
  return `<label class="${wide ? "wide" : ""}">${label}${control}</label>`;
}

function openEditor(kind, index = -1) {
  const item = index >= 0 ? state[`${kind}s`][index] : {};
  const dialog = $("#editorDialog");
  dialog.dataset.kind = kind;
  dialog.dataset.index = String(index);
  $("#dialogEyebrow").textContent = index >= 0 ? "Edit record" : "Add evidence";
  $("#dialogTitle").textContent = kind === "source" ? "Public source" : kind === "contact" ? "Contact path" : "Candidate match";
  if (kind === "source") {
    $("#dialogFields").innerHTML = field("Source type", "type", "select", item.type || sourceTypes[0], false, sourceTypes) + field("Source date", "date", "date", item.date || today()) + field("Source URL", "url", "url", item.url, true) + field("Claim or finding", "finding", "textarea", item.finding, true);
  } else if (kind === "contact") {
    $("#dialogFields").innerHTML = field("Contact type", "type", "select", item.type || contactTypes[0], false, contactTypes) + field("Source date", "date", "date", item.date || today()) + field("Contact value or path", "value", "text", item.value, true) + field("Source URL", "url", "url", item.url, true) + field("Verification note", "note", "textarea", item.note, true);
  } else {
    const statuses = ["Confirmed", "Likely", "Possible", "Needs Verification"];
    $("#dialogFields").innerHTML = field("Name", "name", "text", item.name || state.lead.fullName) + field("Confidence score", "score", "number", item.score ?? 50) + field("Current or likely title", "title", "text", item.title) + field("Company", "company", "text", item.company || state.lead.company) + field("Professional location", "location", "text", item.location) + field("Status", "status", "select", item.status || "Needs Verification", false, statuses) + field("Professional profile URL", "profileUrl", "url", item.profileUrl, true) + field("Matching evidence", "evidence", "textarea", item.evidence, true) + field("Conflicting evidence", "conflict", "textarea", item.conflict, true) + field("Source URLs", "sourceUrls", "textarea", item.sourceUrls, true);
  }
  dialog.showModal();
}

function saveEditor(event) {
  event.preventDefault();
  const dialog = $("#editorDialog");
  const kind = dialog.dataset.kind;
  const index = Number(dialog.dataset.index);
  const formData = Object.fromEntries(new FormData($("#editorForm")).entries());
  if (kind === "source" && (!validPublicUrl(formData.url) || !formData.finding.trim())) return showToast("Add a valid URL and finding");
  if (kind === "contact" && (!validPublicUrl(formData.url) || !formData.value.trim())) return showToast("Add a valid source URL and contact path");
  if (kind === "candidate") {
    formData.score = Math.max(0, Math.min(100, Number(formData.score) || 0));
    if (!formData.name.trim()) return showToast("Candidate name is required");
  }
  const collection = state[`${kind}s`];
  if (index >= 0) collection[index] = formData; else collection.push({ ...formData, id: crypto.randomUUID() });
  if (kind === "candidate" && state.primaryCandidate === null) state.primaryCandidate = 0;
  dialog.close();
  renderAll();
  showToast(`${kind} saved`);
}

function validPublicUrl(value) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; }
}

function removeRecord(kind, index) {
  state[`${kind}s`].splice(index, 1);
  if (kind === "candidate") state.primaryCandidate = state.candidates.length ? Math.min(state.primaryCandidate || 0, state.candidates.length - 1) : null;
  renderAll();
}

function renderSources() {
  $("#sourceEmpty").hidden = state.sources.length > 0;
  $("#sourceCountBadge").textContent = state.sources.length;
  $("#sourceList").innerHTML = state.sources.map((source, index) => {
    const quality = qualityFor(source.type), age = sourceAge(source.date);
    return `<div class="source-item"><span class="quality-badge quality-${quality.toLowerCase()}">${quality}</span><div class="source-copy"><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.finding)}</a><small class="${age.stale ? "stale" : ""}">${escapeHtml(source.type)} / ${age.label}</small></div><div class="row-actions"><button class="icon-btn" data-edit="source" data-index="${index}" aria-label="Edit source">✎</button><button class="icon-btn" data-remove="source" data-index="${index}" aria-label="Delete source">×</button></div></div>`;
  }).join("");
}

function renderContacts() {
  $("#contactEmpty").hidden = state.contacts.length > 0;
  $("#contactList").innerHTML = state.contacts.map((contact, index) => {
    const unverified = contact.type === "Unverified corporate email pattern";
    return `<div class="source-item"><span class="quality-badge ${unverified ? "quality-low" : "quality-high"}">${unverified ? "Unverified" : "Public"}</span><div class="source-copy"><b>${escapeHtml(contact.value)}</b><small>${escapeHtml(contact.type)} / ${escapeHtml(contact.date || "Date missing")} / ${escapeHtml(contact.note || "No verification note")}</small></div><div class="row-actions"><button class="icon-btn" data-edit="contact" data-index="${index}">✎</button><button class="icon-btn" data-remove="contact" data-index="${index}">×</button></div></div>`;
  }).join("");
}

function scoreColor(score) { return score >= 90 ? "var(--mint)" : score >= 70 ? "var(--cyan)" : score >= 50 ? "var(--amber)" : "var(--red)"; }
function initials(name) { return clean(name).split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?"; }

function renderCandidates() {
  $("#candidateCountBadge").textContent = state.candidates.length;
  $("#addCandidateBtn").disabled = state.candidates.length >= 3;
  $("#candidateList").innerHTML = state.candidates.map((candidate, index) => `
    <article class="candidate-card panel ${state.primaryCandidate === index ? "selected" : ""}">
      <div class="candidate-head"><div class="candidate-avatar">${escapeHtml(initials(candidate.name))}</div><div class="candidate-title"><h3>${escapeHtml(candidate.name)}</h3><p>${escapeHtml([candidate.title, candidate.company].filter(Boolean).join(" / ") || "Role unknown")}</p></div><div class="candidate-score"><b style="color:${scoreColor(candidate.score)}">${candidate.score}</b><small>confidence</small></div></div>
      <div class="confidence-track"><i style="width:${candidate.score}%;background:${scoreColor(candidate.score)}"></i></div>
      <div class="candidate-data"><div><span>Professional location</span><p>${escapeHtml(unknown(candidate.location))}</p></div><div><span>Matching evidence</span><p>${escapeHtml(unknown(candidate.evidence))}</p></div><div><span>Conflicting evidence</span><p>${escapeHtml(candidate.conflict || "None recorded")}</p></div><div><span>Sources</span><p>${escapeHtml(unknown(candidate.sourceUrls))}</p></div></div>
      <div class="candidate-tags"><span class="status-tag">${escapeHtml(candidate.status)}</span>${candidate.score < 50 ? '<span class="status-tag" style="color:var(--red)">Do not identify</span>' : ""}</div>
      <label class="candidate-select"><input type="radio" name="primaryCandidate" value="${index}" ${state.primaryCandidate === index ? "checked" : ""}> Primary match</label>
      <div class="row-actions"><button class="icon-btn" data-edit="candidate" data-index="${index}">✎</button><button class="icon-btn" data-remove="candidate" data-index="${index}">×</button></div>
    </article>`).join("");
}

function citationList() {
  return state.sources.map((source, index) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">[S${index + 1}]</a> ${escapeHtml(source.finding)} <small>(${escapeHtml(source.type)}, ${escapeHtml(source.date || "date missing")})</small></li>`).join("") || '<li class="unknown">No sources logged. Do not rely on factual claims yet.</li>';
}

function contactList() {
  return state.contacts.map(contact => `<li><b>${escapeHtml(contact.type)}:</b> ${escapeHtml(contact.value)}. <a href="${escapeHtml(contact.url)}" target="_blank" rel="noopener noreferrer">Source</a>, ${escapeHtml(contact.date || "date missing")}.${contact.type.includes("Unverified") ? " Verify before outreach." : ""}</li>`).join("") || '<li class="unknown">No verified professional contact path recorded.</li>';
}

function candidateList() {
  return state.candidates.map((candidate, index) => `<li><b>${index + 1}. ${escapeHtml(candidate.name)}</b> - ${escapeHtml(candidate.status)}, ${candidate.score}/100. ${escapeHtml(candidate.evidence || "No supporting evidence recorded.")} ${candidate.conflict ? `Conflict: ${escapeHtml(candidate.conflict)}` : ""}</li>`).join("") || '<li class="unknown">No candidates compared. Identity needs verification.</li>';
}

function calculateQuality() {
  if (!state.sources.length) return 0;
  const sourcePoints = state.sources.reduce((sum, source) => sum + ({ High: 18, Medium: 11, Low: 4 }[qualityFor(source.type)] || 0) + (sourceAge(source.date).stale ? 0 : 5), 0);
  const candidatePoints = state.candidates.length ? 12 : 0;
  const contactPoints = state.contacts.some(c => !c.type.includes("Unverified")) ? 8 : 0;
  return Math.min(100, sourcePoints + candidatePoints + contactPoints);
}

function renderReport() {
  readLeadForm();
  const l = state.lead, candidate = state.primaryCandidate !== null ? state.candidates[state.primaryCandidate] : null;
  const fresh = state.sources.filter(s => !sourceAge(s.date).stale).length;
  const stale = state.sources.length - fresh;
  const quality = calculateQuality();
  $("#reportTarget").textContent = [l.fullName, l.company].filter(Boolean).join(" / ") || "Unknown";
  $("#reportEvidence").textContent = `${state.sources.length} source${state.sources.length === 1 ? "" : "s"}`;
  $("#reportFreshness").textContent = state.sources.length ? `${fresh} current / ${stale} stale` : "Needs sources";
  $("#reportConfidence").textContent = candidate ? `${candidate.score}/100 / ${candidate.status}` : "Needs verification";
  $("#qualityScore").textContent = quality;
  $("#qualityRing").style.setProperty("--score-angle", `${quality * 3.6}deg`);
  $("#qualityMessage").textContent = quality >= 75 ? "Good evidence coverage. Complete a final manual review." : quality >= 45 ? "Useful foundation, but key gaps remain." : "Add dated, high-quality sources before outreach.";

  const fit = clean(l.industry) ? "Possible Fit" : "Needs Review";
  $("#reportOutput").innerHTML = `
    <section class="report-section"><h3><span>01</span> Person and company snapshot</h3><p>${escapeHtml(unknown(l.fullName))} is being researched in connection with ${escapeHtml(unknown(l.company))}. The supplied role is ${escapeHtml(unknown(l.jobTitle))}, and the supplied professional location is ${escapeHtml(unknown(l.location))}. The organization or sector is described as ${escapeHtml(unknown(l.industry))}. ${escapeHtml(l.knownDetails || "No additional known details were supplied.")} This snapshot remains subject to the evidence and conflicts listed below.</p></section>
    <section class="report-section"><h3><span>02</span> Professional relevance</h3><span class="report-status">${fit}</span><p>Research purpose: ${escapeHtml(unknown(l.purpose))}. LeadScope does not infer fit from missing facts. Review the cited company evidence and mark Good Fit, Possible Fit, Weak Fit, or No Fit before outreach.</p></section>
    <section class="report-section"><h3><span>03</span> Candidate match comparison</h3><ul>${candidateList()}</ul></section>
    <section class="report-section"><h3><span>04</span> Contact path</h3><ul>${contactList()}</ul><p><b>Still needs verification:</b> Confirm the recipient's current role and confirm any unverified corporate email pattern against an official public source.</p></section>
    <section class="report-section"><h3><span>05</span> Outreach hooks</h3><p class="unknown">Draft hooks only from the dated source findings below. If none is timely and relevant, record: No current trigger found.</p><ul>${citationList()}</ul></section>
    <section class="report-section"><h3><span>06</span> Risk and uncertainty</h3><p>${stale ? `${stale} source${stale === 1 ? " is" : "s are"} older than two years or missing a date. ` : "No stale sources are currently flagged. "}${candidate && candidate.conflict ? `Candidate conflict: ${escapeHtml(candidate.conflict)}. ` : "No candidate conflict is recorded. "}${candidate && candidate.score < 50 ? "The selected candidate is below the identification threshold and must not be treated as identified." : "Manually confirm the selected candidate before outreach."}</p></section>
    <section class="report-section"><h3><span>07</span> Summary</h3><ul><li><b>Best person to review:</b> ${escapeHtml(candidate ? `${candidate.name}, ${unknown(candidate.title)}` : "No verified candidate selected")}</li><li><b>Confidence level:</b> ${escapeHtml(candidate ? `${candidate.score}/100, ${candidate.status}` : "Needs verification")}</li><li><b>Why now:</b> ${state.sources.length ? "Review current source findings for a timely professional trigger." : "No current trigger found."}</li><li><b>Suggested outreach path:</b> ${escapeHtml(state.contacts[0]?.value || "Official company contact page or professional profile needed")}</li></ul></section>`;

  const checks = [
    [l.compliant, "Legitimate outreach confirmed"],
    [state.sources.length >= 2, "At least two sources logged"],
    [state.sources.some(s => qualityFor(s.type) === "High"), "One high-confidence source"],
    [candidate && candidate.score >= 50, "Candidate clears identity threshold"],
    [state.contacts.some(c => !c.type.includes("Unverified")), "Official contact path recorded"],
    [stale === 0 && state.sources.length > 0, "No stale or undated sources"]
  ];
  $("#preflightList").innerHTML = checks.map(([pass, label]) => `<li class="${pass ? "pass" : ""}">${label}</li>`).join("");
}

function reportMarkdown() {
  const l = state.lead, candidate = state.primaryCandidate !== null ? state.candidates[state.primaryCandidate] : null;
  const sourceLines = state.sources.length ? state.sources.map((s, i) => `- [S${i + 1}] ${s.finding} - ${s.type}, ${s.date || "date missing"}: ${s.url}`).join("\n") : "- No sources logged";
  const contactLines = state.contacts.length ? state.contacts.map(c => `- ${c.type}: ${c.value} - ${c.url} (${c.date || "date missing"})${c.type.includes("Unverified") ? " - Unverified, verify before outreach" : ""}`).join("\n") : "- No verified contact path recorded";
  const candidateLines = state.candidates.length ? state.candidates.map(c => `- ${c.name}, ${c.title || "title unknown"}, ${c.company || "company unknown"}: ${c.score}/100, ${c.status}. Evidence: ${c.evidence || "none recorded"}. Conflict: ${c.conflict || "none recorded"}.`).join("\n") : "- Identity needs verification";
  return `# LeadScope brief: ${l.fullName || "Unknown target"}\n\nGenerated ${today()}. Public professional research only.\n\n## 1. Person and company snapshot\n\n- Name: ${unknown(l.fullName)}\n- Role: ${unknown(l.jobTitle)}\n- Company: ${unknown(l.company)}\n- Professional location: ${unknown(l.location)}\n- Industry: ${unknown(l.industry)}\n- Known details: ${l.knownDetails || "None supplied"}\n\n## 2. Professional relevance\n\nResearch purpose: ${unknown(l.purpose)}\n\nFit needs manual review. Do not force a fit from missing facts.\n\n## 3. Candidate match comparison\n\n${candidateLines}\n\nSelected candidate: ${candidate ? `${candidate.name}, ${candidate.score}/100, ${candidate.status}` : "None"}\n\n## 4. Contact path\n\n${contactLines}\n\n## 5. Outreach hooks and sources\n\n${sourceLines}\n\n## 6. Risk and uncertainty\n\nConfirm current role, resolve conflicting evidence, and verify every unverified corporate email pattern before outreach. Sources older than two years should be treated as stale.\n\n## 7. Summary\n\n- Best person to review: ${candidate?.name || "No verified candidate selected"}\n- Confidence level: ${candidate ? `${candidate.score}/100` : "Needs verification"}\n- Why now: ${state.sources.length ? "Review current source findings" : "No current trigger found"}\n- Suggested outreach path: ${state.contacts[0]?.value || "Official contact path needed"}\n`;
}

function renderAll() { renderSources(); renderContacts(); renderCandidates(); }

function loadDemo() {
  const values = { fullName: "Maya Chen", jobTitle: "VP, Store Development", company: "Northstar Coffee Group", location: "Chicago, IL", industry: "Fictional multi-unit coffee retail", linkedinUrl: "https://example.com/profiles/maya-chen", knownDetails: "Fictional demo profile. Northstar is used only to demonstrate the workflow.", purpose: "Evaluate a fictional retail expansion lead for a product demonstration." };
  Object.entries(values).forEach(([id, value]) => $(`#${id}`).value = value);
  $("#compliance").checked = true;
  readLeadForm();
  state.sources = [
    { id: crypto.randomUUID(), type: "Official company website", date: today(), url: "https://example.com/northstar/about", finding: "Fictional Northstar company overview used for interface demonstration" },
    { id: crypto.randomUUID(), type: "Official press release", date: today(), url: "https://example.com/northstar/news", finding: "Fictional expansion announcement used for interface demonstration" }
  ];
  state.contacts = [{ id: crypto.randomUUID(), type: "Official contact page", date: today(), value: "Northstar fictional inquiry form", url: "https://example.com/northstar/contact", note: "Fictional demo path, not a real company contact" }];
  state.candidates = [{ id: crypto.randomUUID(), name: "Maya Chen", title: "VP, Store Development", company: "Northstar Coffee Group", location: "Chicago, IL", profileUrl: "https://example.com/profiles/maya-chen", score: 94, evidence: "Fictional official bio and fictional company announcement agree on role.", conflict: "None in the fictional demo.", sourceUrls: "https://example.com/northstar/about\nhttps://example.com/northstar/news", status: "Confirmed" }];
  state.primaryCandidate = 0;
  buildQueries(); renderAll(); showToast("Fictional demo loaded");
}

function clearAll() {
  if (!confirm("Clear every field and research record from this tab?")) return;
  $("#leadForm").reset();
  Object.assign(state, { lead: {}, sources: [], contacts: [], candidates: [], primaryCandidate: null });
  $("#queryTarget").textContent = "Awaiting target";
  $("#queryList").className = "query-list empty-state";
  $("#queryList").innerHTML = "<p>Complete lead setup to generate queries.</p>";
  renderAll(); goTo("setup"); showToast("Session cleared");
}

document.addEventListener("click", event => {
  const step = event.target.closest("[data-view]"); if (step) goTo(step.dataset.view);
  const go = event.target.closest("[data-go]"); if (go) goTo(go.dataset.go);
  const edit = event.target.closest("[data-edit]"); if (edit) openEditor(edit.dataset.edit, Number(edit.dataset.index));
  const remove = event.target.closest("[data-remove]"); if (remove) removeRecord(remove.dataset.remove, Number(remove.dataset.index));
});

$("#leadForm").addEventListener("submit", event => { event.preventDefault(); if (validateSetup()) { buildQueries(); goTo("research"); } });
$("#addSourceBtn").addEventListener("click", () => openEditor("source"));
$("#addContactBtn").addEventListener("click", () => openEditor("contact"));
$("#addCandidateBtn").addEventListener("click", () => state.candidates.length < 3 && openEditor("candidate"));
$("#editorForm").addEventListener("submit", saveEditor);
$("#candidateList").addEventListener("change", event => { if (event.target.name === "primaryCandidate") { state.primaryCandidate = Number(event.target.value); renderCandidates(); } });
$("#buildBriefBtn").addEventListener("click", () => { readLeadForm(); goTo("brief"); });
$("#loadDemoBtn").addEventListener("click", loadDemo);
$("#clearBtn").addEventListener("click", clearAll);
$("#copyBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText(reportMarkdown()); showToast("Report copied"); } catch { showToast("Clipboard permission unavailable"); } });
$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([reportMarkdown()], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `leadscope-${(state.lead.fullName || "lead").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`; link.click(); URL.revokeObjectURL(link.href); showToast("Markdown exported");
});

renderAll();
