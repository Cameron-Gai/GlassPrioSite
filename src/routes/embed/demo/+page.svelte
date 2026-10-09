<script lang="ts">
  /**
   * /embed/demo — what the embedded form looks like on an ad landing page,
   * for the Mancini Digital conversation. A sample page with the form in an
   * iframe, a live log of the messages the form sends, and the copy-paste
   * snippet. Not linked from anywhere; noindex.
   */
  import { onDestroy, onMount } from 'svelte';

  const SITE = 'https://glassfast.up.railway.app';
  const demoSrc = '/embed?utm_source=mancini&utm_medium=cpc&utm_campaign=demo-landing&gclid=DEMO-CLICK-ID';

  let frame: HTMLIFrameElement;
  let height = 720;
  let log: Array<{ at: string; text: string }> = [];
  let copied = false;

  function note(text: string) {
    log = [{ at: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }), text }, ...log].slice(0, 8);
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== window.location.origin) return;
    const d = (e.data ?? {}) as { type?: string; height?: number; confirmationNumber?: string; service?: string };
    if (d.type === 'glassdoctor:resize' && typeof d.height === 'number') {
      height = d.height;
    } else if (d.type === 'glassdoctor:step') {
      frame?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      note('Step changed — page scrolled the form into view');
    } else if (d.type === 'glassdoctor:booked') {
      note(`BOOKED ${d.confirmationNumber}${d.service ? ` — ${d.service}` : ''}. This is where the Google Ads conversion fires.`);
    }
  }

  onMount(() => window.addEventListener('message', onMessage));
  onDestroy(() => typeof window !== 'undefined' && window.removeEventListener('message', onMessage));

  const snippet = `<!-- Glass Doctor booking form -->
<iframe id="gd-booking" src="${SITE}/embed?utm_source=mancini&utm_medium=cpc&utm_campaign=YOUR-CAMPAIGN"
  title="Book Glass Doctor" style="width:100%;border:0;min-height:640px" allow="payment"></iframe>
<script>
(function () {
  var f = document.getElementById('gd-booking');
  // Forward this page's own UTM tags and Google click ids to the form.
  var u = new URL(f.src);
  new URLSearchParams(location.search).forEach(function (v, k) {
    if (/^(utm_|gclid$|gbraid$|wbraid$)/.test(k)) u.searchParams.set(k, v);
  });
  f.src = u.toString();
  window.addEventListener('message', function (e) {
    if (e.origin !== '${SITE}') return;
    var d = e.data || {};
    if (d.type === 'glassdoctor:resize') f.style.height = d.height + 'px';
    if (d.type === 'glassdoctor:step') f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (d.type === 'glassdoctor:booked') {
      // A real booking just landed in ServiceTitan. Fire your conversion, e.g.:
      // gtag('event', 'conversion', { send_to: 'AW-XXXX/YYYY', transaction_id: d.confirmationNumber });
    }
  });
})();
<\/script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      /* the snippet is visible to select by hand */
    }
  }
</script>

<svelte:head>
  <title>Embedded Booking Demo</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="demo-banner">Demo landing page — how the Glass Doctor booking form sits on an ad page. Bookings made here go into ServiceTitan for real — click through, but don't submit.</div>

<main class="page">
  <section class="hero">
    <div class="copy">
      <p class="eyebrow">Seattle · Tacoma · Eastside</p>
      <h1>Broken window or door glass? Book a visit in two minutes.</h1>
      <p class="lede">Local, insured glass specialists. See any visit charge before you book, pick a day that suits you, and a real person confirms your appointment.</p>
      <ul class="points">
        <li>Glass replacement for homes and businesses</li>
        <li>Storefronts, doors, showers and mirrors</li>
        <li>Same-day emergency service</li>
      </ul>
      <p class="call">Rather talk? <a href="tel:+12065082444">(206) 508-2444</a></p>
    </div>

    <div class="form-col">
      <iframe bind:this={frame} src={demoSrc} title="Book Glass Doctor" style="height: {height}px" allow="payment"></iframe>
    </div>
  </section>

  <section class="dev">
    <div class="log">
      <h2>What the form tells the page</h2>
      <p class="muted">Live messages from the embedded form. Mike's page uses the last one to fire his Google Ads conversion.</p>
      <ul>
        {#each log as l (l.at + l.text)}
          <li><span class="muted">{l.at}</span> {l.text}</li>
        {:else}
          <li class="muted">Click through a step in the form to see messages here.</li>
        {/each}
      </ul>
      <h2>What lands on the ServiceTitan booking</h2>
      <p class="muted">The page's UTM tags and Google click id ride along. The booking summary gets a line like <code>LEAD SOURCE: mancini / cpc / demo-landing (Google click id on file)</code>, and each value is stored on the booking's extra data for matchback.</p>
    </div>

    <div class="snippet">
      <div class="snippet-head">
        <h2>Copy-paste for the landing page</h2>
        <button type="button" on:click={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre><code>{snippet}</code></pre>
    </div>
  </section>
</main>

<style>
  .demo-banner {
    background: #fff4dc;
    color: #6b4300;
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
    padding: 0.5rem 1rem;
  }

  .page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 2rem 1.2rem 4rem;
    display: grid;
    gap: 3rem;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 560px);
    gap: 2.5rem;
    align-items: start;
  }

  @media (max-width: 960px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .copy {
    display: grid;
    gap: 1rem;
    padding-top: 1rem;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-red-web);
  }

  h1 {
    margin: 0;
    font-size: clamp(1.9rem, 3.4vw, 2.8rem);
    line-height: 1.1;
    font-weight: 800;
    color: var(--color-primary);
    text-wrap: balance;
  }

  .lede {
    margin: 0;
    font-size: 1.08rem;
    color: var(--color-muted);
    max-width: 52ch;
  }

  .points {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.35rem;
  }

  .call {
    margin: 0;
    font-weight: 600;
  }

  iframe {
    width: 100%;
    border: 0;
    min-height: 560px;
    display: block;
    background: transparent;
  }

  .dev {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
    gap: 2rem;
    border-top: 1px solid var(--color-border);
    padding-top: 2rem;
  }

  @media (max-width: 960px) {
    .dev {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  h2 {
    margin: 0 0 0.4rem;
    font-size: 1rem;
  }

  .log {
    display: grid;
    gap: 0.4rem;
    align-content: start;
  }

  .log ul {
    margin: 0 0 1rem;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.3rem;
    font-size: 0.88rem;
  }

  .muted {
    color: var(--color-muted);
    font-size: 0.88rem;
    margin: 0;
  }

  code {
    font-size: 0.82rem;
  }

  .snippet-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .snippet-head button {
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  pre {
    margin: 0.4rem 0 0;
    padding: 1rem;
    border-radius: 10px;
    background: #10152b;
    color: #e6e9f5;
    overflow-x: auto;
    font-size: 0.78rem;
    line-height: 1.5;
  }
</style>
