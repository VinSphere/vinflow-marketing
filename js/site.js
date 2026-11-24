document.querySelector('.nav-mobile-toggle').addEventListener('click',function(){document.querySelector('.nav-links').classList.toggle('open');});
var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');}});},{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(this.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('.nav-links').classList.remove('open');});});
// ===========================================================
// Intake: a short multi-step form. Submits to the HubSpot Forms
// API, then to Formspree (mpqywrej) as a backup; either 2xx counts.
// Dealers and auctions then pick a demo time in the HubSpot scheduler.
// Ported from vinsphere.com (MKT-27).
// ===========================================================
var SITE = 'vinflow.com';
var HUBSPOT_SUBMIT_URL = 'https://api.hsforms.com/submissions/v3/integration/submit/52286835/3fa169df-d155-4db7-8376-6cdd35264e06';
var FORMSPREE_URL = 'https://formspree.io/f/mpqywrej';
// Step 4 opens the scheduler page in a new tab, name and email prefilled.
var HUBSPOT_MEETING_URL = 'https://meetings.hubspot.com/italo-de-souza';
// The whole send is capped at 10 s. HubSpot gets up to 6 s so the
// Formspree backup always keeps at least 4 s.
var SEND_BUDGET_MS = 10000;
var HUBSPOT_BUDGET_MS = 6000;
var AUDIENCE_LABELS = {
    dealer: 'Dealer group or store',
    auction: 'Auction or remarketing company',
    partner: 'Partner or vendor',
    other: 'Something else'
};

var form = document.getElementById('ea-form');
var success = document.getElementById('form-success');
var schedule = document.getElementById('form-schedule');
var btn = document.getElementById('form-submit');
var btnLabel = btn.querySelector('.btn-label');
var spinner = btn.querySelector('.spinner');
var errorBox = document.getElementById('form-error');
var intake = document.getElementById('intake');
var progressLabel = document.getElementById('progress-label');
var progressBar = document.getElementById('progress-bar');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
var backButtons = form.querySelectorAll('[data-back]');
document.querySelectorAll('.step-title').forEach(function (h) { h.setAttribute('aria-describedby', 'progress-label'); });
var steps = {};
form.querySelectorAll('.ea-step').forEach(function (fs) { steps[fs.getAttribute('data-step')] = fs; });
var current = 'audience';
var trail = [];
var sending = false;

function audience() { return form.elements.audience.value; }
function wantsDemo() { var a = audience(); return a === 'dealer' || a === 'auction'; }
function submitText() { return wantsDemo() ? 'Send and pick a time →' : 'Send →'; }

// Progress: M = 4 when a booking step follows (dealer, auction, or not chosen yet), else 3.
function totalSteps() { return !audience() || wantsDemo() ? 4 : 3; }
function stepNumber(view) {
    if (view === 'audience') return 1;
    if (view === 'dealer' || view === 'auction') return 2;
    if (view === 'contact') return wantsDemo() ? 3 : 2;
    return totalSteps(); // schedule, success
}
function renderProgress(view) {
    var n = stepNumber(view);
    var m = totalSteps();
    progressLabel.textContent = 'Step ' + n + ' of ' + m;
    progressBar.innerHTML = '';
    for (var i = 0; i < m; i++) {
        var seg = document.createElement('span');
        if (i < n) seg.className = 'on';
        progressBar.appendChild(seg);
    }
}
renderProgress('audience');
form.querySelectorAll('input[name="audience"]').forEach(function (r) {
    r.addEventListener('change', function () { renderProgress('audience'); });
});

// Swap what the intake shows, easing its height so the page below doesn't jump.
var resizeTimer = null;
function swapView(change) {
    var from = intake.offsetHeight;
    change();
    if (reduceMotion.matches) return;
    var to = intake.offsetHeight;
    if (from === to) return;
    clearTimeout(resizeTimer);
    intake.classList.remove('is-resizing');
    intake.style.height = from + 'px';
    void intake.offsetHeight;
    intake.classList.add('is-resizing');
    intake.style.height = to + 'px';
    resizeTimer = setTimeout(function () {
        intake.classList.remove('is-resizing');
        intake.style.height = '';
    }, 300);
}

function showStep(name) {
    swapView(function () {
        Object.keys(steps).forEach(function (k) { steps[k].hidden = k !== name; });
        current = name;
        if (name === 'contact') btnLabel.textContent = submitText();
        renderProgress(name);
        steps[name].querySelector('.step-title').focus();
    });
}
function nextStep(name) {
    if (name === 'audience') {
        var a = audience();
        return a === 'dealer' ? 'dealer' : a === 'auction' ? 'auction' : 'contact';
    }
    return 'contact';
}

var MESSAGES = {
    firstName: 'Enter your first name.',
    lastName: 'Enter your last name.',
    email: 'Enter your work email.',
    phone: 'Enter a 10-digit phone number.',
    dealershipType: 'Choose franchise or independent.',
    company: 'Enter your company or dealership name.',
    rooftops: 'Choose how many rooftops you run.',
    audience: 'Choose what brings you here.',
    auctionInterest: 'Choose what you are interested in.'
};
function fieldError(input) {
    var id = input.id + '-error';
    var el = document.getElementById(id);
    if (!el) {
        el = document.createElement('p');
        el.className = 'field-error';
        el.id = id;
        el.hidden = true;
        (input.closest('.select-wrap') || input).insertAdjacentElement('afterend', el);
        input.setAttribute('aria-describedby', id);
    }
    return el;
}
function setInvalid(input, message) {
    var el = fieldError(input);
    input.setAttribute('aria-invalid', 'true');
    el.textContent = message;
    el.hidden = false;
}
function clearInvalid(input) {
    input.removeAttribute('aria-invalid');
    var el = document.getElementById(input.id + '-error');
    if (el) { el.hidden = true; el.textContent = ''; }
}
// The browser accepts "name@x"; a work email also needs a dot in its domain.
function emailDomainOk(value) {
    var at = value.lastIndexOf('@');
    if (at < 1) return false;
    var domain = value.slice(at + 1);
    var dot = domain.indexOf('.');
    return dot > 0 && dot < domain.length - 1;
}
function isValid(input) {
    if (input.required && !input.value.trim()) return false;
    if (!input.checkValidity()) return false;
    if (input.type === 'email') return emailDomainOk(input.value.trim());
    // At least 10 digits once spaces, dashes, dots and brackets are stripped.
    if (input.type === 'tel') return input.value.replace(/\D/g, '').length >= 10;
    return true;
}
function messageFor(input) {
    if (input.type === 'email' && input.value.trim()) {
        return 'Enter an email like name@dealership.com.';
    }
    return MESSAGES[input.name] || 'This field is required.';
}
// R48: the phone number formats itself as (XXX) XXX-XXXX while the visitor types or pastes.
function phoneMask(raw, caret, backspace) {
    var digits = raw.replace(/\D/g, '');
    var before = raw.slice(0, caret).replace(/\D/g, '').length;
    if (backspace && before > 0) {
        digits = digits.slice(0, before - 1) + digits.slice(before);
        before -= 1;
    }
    // US area codes start 2-9: a leading 1 (country code) or 0 is dropped, typed or pasted.
    var lead = digits.match(/^[01]*/)[0].length;
    if (lead) {
        digits = digits.slice(lead);
        before = Math.max(0, before - lead);
    }
    digits = digits.slice(0, 10);
    before = Math.min(before, digits.length);
    var out = digits.length ? '(' + digits.slice(0, 3) : '';
    if (digits.length > 3) out += ') ' + digits.slice(3, 6);
    if (digits.length > 6) out += '-' + digits.slice(6);
    var pos = 0, seen = 0;
    while (seen < before && pos < out.length) {
        if (/\d/.test(out.charAt(pos))) seen++;
        pos++;
    }
    return { value: out, caret: pos };
}
function bindPhoneMask(input) {
    var digitsBefore = 0, collapsed = true;
    function apply(raw, caret, backspace) {
        var m = phoneMask(raw, caret, backspace);
        input.value = m.value;
        if (document.activeElement === input) input.setSelectionRange(m.caret, m.caret);
    }
    input.addEventListener('beforeinput', function () {
        digitsBefore = input.value.replace(/\D/g, '').length;
        collapsed = input.selectionStart === input.selectionEnd;
    });
    input.addEventListener('input', function (e) {
        var caret = input.selectionStart;
        var same = collapsed && input.value.replace(/\D/g, '').length === digitsBefore;
        // Delete over ") " or "-" (no selection) removes the digit after it instead of sticking.
        if (same && e.inputType === 'deleteContentForward') {
            var d = input.value.replace(/\D/g, '');
            var b = input.value.slice(0, caret).replace(/\D/g, '').length;
            apply(d.slice(0, b) + d.slice(b + 1), b, false);
            return;
        }
        // Backspace over ") " or "-" (no selection) removes the digit before it instead of sticking.
        apply(input.value, caret, same && e.inputType === 'deleteContentBackward');
    });
    // Autofill that fires only "change" still gets formatted.
    input.addEventListener('change', function () { apply(input.value, input.value.length, false); });
    // Formatted here rather than by the browser, so maxlength cannot cut "+1 392-849-2392" short.
    input.addEventListener('paste', function (e) {
        var data = e.clipboardData || window.clipboardData;
        if (!data) return;
        var text = data.getData('text');
        var v = input.value, start = input.selectionStart, end = input.selectionEnd;
        e.preventDefault();
        apply(v.slice(0, start) + text + v.slice(end), start + text.length, false);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
}
bindPhoneMask(document.getElementById('phone'));

var FIELD_SELECTOR = 'input[required]:not([type="radio"]), select[required]';
form.querySelectorAll(FIELD_SELECTOR).forEach(function (input) {
    var evt = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(evt, function () {
        if (input.getAttribute('aria-invalid') === 'true' && isValid(input)) clearInvalid(input);
    });
});

// One-choice groups (step 1, auctions): required radio sets.
function groupChosen(name) { return !!form.elements[name].value; }
function setGroupInvalid(name, on) {
    var group = document.getElementById(name + '-group');
    var err = document.getElementById(name + '-error');
    group.classList.toggle('is-invalid', on);
    group.querySelectorAll('input').forEach(function (r) {
        if (on) { r.setAttribute('aria-invalid', 'true'); r.setAttribute('aria-describedby', err.id); }
        else { r.removeAttribute('aria-invalid'); r.removeAttribute('aria-describedby'); }
    });
    err.textContent = on ? MESSAGES[name] : '';
    err.hidden = !on;
}
['audience', 'auctionInterest', 'dealershipType'].forEach(function (name) {
    document.getElementById(name + '-group').addEventListener('change', function () {
        if (this.classList.contains('is-invalid')) setGroupInvalid(name, false);
    });
});

// "Interested In" is required for dealers: at least one box.
var interestsBlock = form.querySelector('.interests-block');
var interestsGrid = interestsBlock.querySelector('[data-products-target]');
var interestsError = document.getElementById('interests-error');
function interestsChosen() { return !!interestsGrid.querySelector('input[type="checkbox"]:checked'); }
function setInterestsInvalid(on) {
    interestsBlock.classList.toggle('is-invalid', on);
    interestsGrid.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
        if (on) cb.setAttribute('aria-invalid', 'true'); else cb.removeAttribute('aria-invalid');
    });
    interestsError.textContent = on ? 'Choose at least one option.' : '';
    interestsError.hidden = !on;
}
interestsGrid.addEventListener('change', function () {
    if (interestsBlock.classList.contains('is-invalid') && interestsChosen()) setInterestsInvalid(false);
});

// Validates the visible step; focuses its first invalid control.
function validateStep(name) {
    var step = steps[name];
    var anyBad = false;
    step.querySelectorAll(FIELD_SELECTOR).forEach(function (input) {
        if (isValid(input)) { clearInvalid(input); return; }
        setInvalid(input, messageFor(input));
        anyBad = true;
    });
    if (name === 'audience' || name === 'auction') {
        var group = name === 'audience' ? 'audience' : 'auctionInterest';
        var none = !groupChosen(group);
        setGroupInvalid(group, none);
        if (none) anyBad = true;
    }
    if (name === 'dealer') {
        var noType = !groupChosen('dealershipType');
        setGroupInvalid('dealershipType', noType);
        if (noType) anyBad = true;
        var noInterest = !interestsChosen();
        setInterestsInvalid(noInterest);
        if (noInterest) anyBad = true;
    }
    if (anyBad) {
        var firstBad = step.querySelector('[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
    }
    return !anyBad;
}

function setLoading(on) {
    sending = on;
    spinner.hidden = !on;
    btnLabel.textContent = on ? 'Sending…' : submitText();
    if (on) { btn.setAttribute('aria-disabled', 'true'); form.setAttribute('aria-busy', 'true'); }
    else { btn.removeAttribute('aria-disabled'); form.removeAttribute('aria-busy'); }
    backButtons.forEach(function (b) {
        if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
}

function val(id) { return document.getElementById(id).value.trim(); }
function collect() {
    var a = audience();
    var checked = a === 'dealer' ? interestsGrid.querySelectorAll('input[type="checkbox"]:checked') : [];
    var interests = [];
    var interestNames = [];
    Array.prototype.forEach.call(checked, function (cb) {
        interests.push(cb.value);
        interestNames.push(cb.closest('label').querySelector('.interest-option-name').textContent);
    });
    var dealershipType = a === 'dealer' ? form.elements.dealershipType.value : '';
    var rooftops = a === 'dealer' ? form.elements.rooftops.value : '';
    var auctionInterest = a === 'auction' ? form.elements.auctionInterest.value : '';
    var interestedIn = a === 'dealer' ? interestNames.join(', ') : auctionInterest;
    var d = {
        firstName: val('firstName'),
        lastName: val('lastName'),
        email: val('email'),
        phone: val('phone'),
        company: val('company'),
        jobTitle: val('jobTitle'),
        audience: AUDIENCE_LABELS[a],
        dealershipType: dealershipType,
        rooftops: rooftops,
        interests: interests,
        auctionInterest: auctionInterest,
        notes: val('notes')
    };
    d.message = [
        'Audience: ' + d.audience,
        'Dealer type: ' + (dealershipType || 'n/a'),
        'Rooftops: ' + (rooftops || 'n/a'),
        'Interested in: ' + (interestedIn || 'n/a'),
        'Source: ' + SITE,
        'Notes: ' + d.notes
    ].join('\n');
    return d;
}
function readCookie(name) {
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(name + '=') === 0) return decodeURIComponent(parts[i].slice(name.length + 1));
    }
    return '';
}
function hubspotBody(d) {
    var fields = [
        ['firstname', d.firstName], ['lastname', d.lastName], ['email', d.email],
        ['phone', d.phone], ['company', d.company], ['jobtitle', d.jobTitle], ['message', d.message]
    ].filter(function (f) { return f[1]; }).map(function (f) { return { name: f[0], value: f[1] }; });
    var context = { pageUri: location.href, pageName: document.title };
    var hutk = readCookie('hubspotutk');
    if (hutk) context.hutk = hutk;
    return { fields: fields, context: context };
}
function formspreeBody(d) {
    var body = {};
    Object.keys(d).forEach(function (k) { body[k] = d[k]; });
    body._source_site = window.location.hostname || SITE;
    return body;
}
// Resolves true on a 2xx, false on anything else, including an abort after ms (never rejects).
function post(url, body, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
        signal: ctrl.signal
    }).then(function (res) { return res.ok; }, function () { return false; })
      .then(function (ok) { clearTimeout(timer); return ok; });
}

function showBooking(d) {
    document.getElementById('schedule-link').href = HUBSPOT_MEETING_URL +
        (HUBSPOT_MEETING_URL.indexOf('?') === -1 ? '?' : '&') +
        'firstName=' + encodeURIComponent(d.firstName) +
        '&lastName=' + encodeURIComponent(d.lastName) +
        '&email=' + encodeURIComponent(d.email);
    document.getElementById('schedule-email').textContent = d.email;
    swapView(function () {
        form.hidden = true;
        schedule.hidden = false;
        renderProgress('schedule');
        schedule.querySelector('.step-title').focus();
    });
}
function showThanks(d) {
    document.getElementById('success-title').textContent = 'Thanks, ' + d.firstName + '.';
    swapView(function () {
        form.hidden = true;
        success.style.display = 'block';
        renderProgress('success');
        success.focus();
    });
}

var noteToggle = document.getElementById('note-toggle');
noteToggle.addEventListener('click', function () {
    swapView(function () {
        noteToggle.setAttribute('aria-expanded', 'true');
        document.getElementById('note-field').hidden = false;
        noteToggle.hidden = true;
        document.getElementById('notes').focus();
    });
});

backButtons.forEach(function (b) {
    b.addEventListener('click', function () {
        if (sending || !trail.length) return;
        errorBox.hidden = true;
        showStep(trail.pop());
    });
});

form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    if (!validateStep(current)) return;
    if (current !== 'contact') {
        trail.push(current);
        showStep(nextStep(current));
        return;
    }
    errorBox.hidden = true;
    setLoading(true);
    var d = collect();
    var started = Date.now();
    // HubSpot first, then Formspree, so the backup can say whether HubSpot failed.
    post(HUBSPOT_SUBMIT_URL, hubspotBody(d), HUBSPOT_BUDGET_MS).then(function (hubspotOk) {
        var backup = formspreeBody(d);
        if (!hubspotOk) backup._hubspot_failed = 'true';
        return post(FORMSPREE_URL, backup, SEND_BUDGET_MS - (Date.now() - started))
            .then(function (formspreeOk) { return hubspotOk || formspreeOk; });
    }).then(function (ok) {
        setLoading(false);
        if (!ok) {
            errorBox.innerHTML = 'Something went wrong and we couldn\'t send this. Please try again, or email <a href="mailto:sales@vinsphere.com">sales@vinsphere.com</a> directly.';
            errorBox.hidden = false;
            return;
        }
        if (wantsDemo()) showBooking(d); else showThanks(d);
    });
});
