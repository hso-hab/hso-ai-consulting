const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
function closeMenu(returnFocus=false) {
  toggle.setAttribute('aria-expanded','false'); nav.classList.remove('is-open');
  if(returnFocus) toggle.focus();
}
toggle.addEventListener('click',()=>{
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && toggle.getAttribute('aria-expanded')==='true')closeMenu(true);});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu()));
matchMedia('(min-width:801px)').addEventListener('change',()=>closeMenu());
const form = document.querySelector('#contact-form');
if (form) {
  let confirmed = false;
  let sending = false;
  const sendButton = document.querySelector('#send-form');
  const status = document.querySelector('#send-status');
  const editButton = document.querySelector('#edit-form');
  form.addEventListener('submit',e=>{
    e.preventDefault();
    for (const id of ['name','message']) {
      const field = document.getElementById(id);
      field.value = field.value.trim();
      field.setCustomValidity(field.value.length < (id==='message'?10:1) ? (id==='message'?'ご相談内容を10文字以上でご入力ください。':'お名前をご入力ください。') : '');
    }
    if(!form.reportValidity())return;
    const data = new FormData(form);
    const details = document.querySelector('#confirmation-details');
    details.replaceChildren();
    for (const [key,label] of [['name','お名前'],['company','会社名・屋号'],['email','メールアドレス'],['message','ご相談内容']]) {
      const row=document.createElement('div');const dt=document.createElement('dt');const dd=document.createElement('dd');
      dt.textContent=label;dd.textContent=String(data.get(key)||'未入力');row.append(dt,dd);details.append(row);
    }
    confirmed = true;
    form.hidden=true;const confirmation=document.querySelector('#confirmation');confirmation.hidden=false;confirmation.focus();
  });
  form.addEventListener('input',e=>{if(e.target.setCustomValidity)e.target.setCustomValidity('');});
  form.inert = false;
  form.querySelector('[type=submit]').disabled = false;
  document.querySelector('#edit-form').addEventListener('click',()=>{
    if (sending) return;
    confirmed = false;
    if (status) status.textContent = '';
    document.querySelector('#confirmation').hidden=true;form.hidden=false;document.querySelector('#name').focus();
  });
  sendButton?.addEventListener('click', () => {
    if (!confirmed || sending || form.dataset.deliveryEnabled !== 'true') return;
    // The public submission ID routes mail server-side; recipient addresses are never embedded.
    if (!/^https:\/\/formsubmit\.co\/[A-Za-z0-9_-]{20,128}$/.test(form.getAttribute('action') || '')) {
      status.textContent = '送信設定を確認できませんでした。時間をおいてお試しください。';
      return;
    }
    if (!form.checkValidity()) {
      confirmed = false;
      document.querySelector('#confirmation').hidden = true;
      form.hidden = false;
      form.reportValidity();
      return;
    }
    sending = true;
    sendButton.disabled = true;
    editButton.disabled = true;
    status.textContent = '送信先に接続しています。認証画面が表示された場合は、案内に従ってください。';
    HTMLFormElement.prototype.submit.call(form);
  });
  // Returning from the provider's error/challenge screen preserves editable input.
  addEventListener('pageshow', () => {
    sending = false;
    if (sendButton) sendButton.disabled = false;
    editButton.disabled = false;
    if (status) status.textContent = '';
  });
}
