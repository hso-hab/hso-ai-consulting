(() => {
  'use strict';
  const body = document.body;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const control = document.querySelector('.motion-control');
  const progress = document.querySelector('.motion-progress');
  const hero = document.querySelector('.hero');
  const art = document.querySelector('.intelligence-art');
  const lab = document.querySelector('.ai-lab');
  const canvas = document.querySelector('#intelligence-canvas');
  const context = canvas.getContext('2d');
  const animations = new Set();
  const seen = new WeakSet();
  let manuallyPaused = false;
  try { manuallyPaused = localStorage.getItem('hso-ai-motion-paused') === 'true'; } catch {}
  let running = false, printing = false, heroVisible = true, raf = 0, scrollFrame = 0;
  let elapsed = 0, last = 0, width = 0, height = 0, pointerX = 0, pointerY = 0;
  let points = [], links = [], observer, stage = 0, manualStage = false;
  const phaseTitles = ['まずは、情報をひとつに。', 'AIが整理。仕事の見通しが変わる。', '最後は、人の判断で前へ。'];
  const phaseCopies = [
    '日々の資料や問い合わせを整理し、AIを活用できる業務を見つけます。',
    '要約や下書きで、情報を扱いやすい形へ。確認すべきポイントも整理します。',
    '担当者が内容を確かめ、次のアクションへ。AIに任せきりにしない運用を設計します。'
  ];
  function animate(element, keyframes, options) {
    if (!running || !element.animate) return;
    const a = element.animate(keyframes, options);
    animations.add(a);
    a.onfinish = a.oncancel = () => animations.delete(a);
  }
  function setStage(next, user = false) {
    if (user) manualStage = true;
    if (next === stage && !user) return;
    stage = next;
    lab.dataset.stage = String(next);
    document.querySelector('#stage-number').textContent = `0${next + 1}`;
    document.querySelector('#stage-title').textContent = phaseTitles[next];
    document.querySelector('#stage-copy').textContent = phaseCopies[next];
    document.querySelectorAll('[data-stage-button]').forEach((b, i) => b.setAttribute('aria-pressed', String(i === next)));
    animate(document.querySelector('.stage-caption'), [{opacity:.4,translate:'0 9px'},{opacity:1,translate:'0 0'}], {duration:450,easing:'ease-out'});
  }
  document.querySelectorAll('[data-stage-button]').forEach(b => b.addEventListener('click', () => setStage(Number(b.dataset.stageButton), true)));
  function scrollUpdate() {
    scrollFrame = 0;
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${total > 0 ? Math.max(0,Math.min(1,scrollY/total)) : 0})`;
    // Scroll narrative only where the layout is pinned; mobile uses explicit controls.
    if (running && innerWidth >= 1000 && innerHeight >= 650 && !manualStage) {
      const rect = lab.getBoundingClientRect();
      const amount = (84 - rect.top) / Math.max(1, rect.height - innerHeight + 84);
      if (rect.top < innerHeight && rect.bottom > 84) setStage(Math.min(2,Math.max(0,Math.floor(amount * 3))));
    }
  }
  const queueScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(scrollUpdate); };
  addEventListener('scroll', queueScroll, {passive:true});
  // A click can itself scroll the viewport. Resume the narrative only when the
  // reader deliberately scrolls, not during the browser’s click-to-view motion.
  addEventListener('wheel', () => {manualStage=false;}, {passive:true});
  addEventListener('touchmove', () => {manualStage=false;}, {passive:true});
  addEventListener('keydown', e => {if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key) && !e.target.closest('button,input,textarea')) manualStage=false;});
  function buildPoints() {
    const count = innerWidth < 600 ? 360 : 640;
    points = Array.from({length:count}, (_,i) => {
      const y = 1 - 2 * (i + .5) / count;
      const r = Math.sqrt(1 - y*y), a = i * Math.PI * (3 - Math.sqrt(5));
      return {x:Math.cos(a)*r,y,z:Math.sin(a)*r};
    });
    links = [];
    // A sparse network, generated once, not an O(n²) calculation per frame.
    for (let i=0;i<count;i+=2) {
      for (let j=i+1;j<count;j++) {
        const p=points[i],q=points[j], d=(p.x-q.x)**2+(p.y-q.y)**2+(p.z-q.z)**2;
        if(d < .042 && d > .018) links.push([i,j]);
      }
    }
  }
  function sizeCanvas() {
    width = art.clientWidth; height = art.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    if (context) context.setTransform(dpr,0,0,dpr,0,0);
    buildPoints(); draw();
  }
  function project(x,y,z,angle,tilt,radius) {
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const rx=x*cos+z*sin, rz=-x*sin+z*cos;
    const ry=y*Math.cos(tilt)-rz*Math.sin(tilt), zz=y*Math.sin(tilt)+rz*Math.cos(tilt);
    const perspective=3.5/(3.5-zz);
    return {x:width/2+rx*radius*perspective,y:height/2+ry*radius*perspective,z:zz};
  }
  function draw() {
    if (!context || !width || !height) return;
    const c=context, t=elapsed*.0001;
    c.clearRect(0,0,width,height);
    const radius=Math.min(width*.345,height*.35);
    const angle=t+pointerX*.1, tilt=.28+Math.sin(t*.7)*.13+pointerY*.08;
    const glow=c.createRadialGradient(width/2,height/2,0,width/2,height/2,radius*1.25);
    glow.addColorStop(0,'rgba(116,188,120,.12)');glow.addColorStop(.7,'rgba(100,190,148,.04)');glow.addColorStop(1,'rgba(100,190,148,0)');
    c.fillStyle=glow;c.fillRect(0,0,width,height);
    const projected=points.map(p=>project(p.x,p.y,p.z,angle,tilt,radius));
    c.lineWidth=.55;
    for(const [a,b] of links){const p=projected[a],q=projected[b];const opacity=.035+Math.max(0,(p.z+q.z)/2)*.17;c.strokeStyle=`rgba(157,210,174,${opacity})`;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}
    for(let i=0;i<projected.length;i++){
      const p=projected[i];const pulse=.65+.35*Math.sin(t*6+i*.11);
      const alpha=.2+(p.z+1)/2*.7;
      c.fillStyle=i%9===0?`rgba(217,249,142,${alpha})`:`rgba(126,214,210,${alpha*.8})`;
      c.beginPath();c.arc(p.x,p.y,(p.z+2)*.62*(i%9===0?1.4:1)*pulse,0,Math.PI*2);c.fill();
    }
    for(let ring=0;ring<3;ring++){
      c.beginPath();const offset=ring*Math.PI/3+.2;
      for(let i=0;i<=130;i++){
        const a=i/130*Math.PI*2;
        const p=project(Math.cos(a)*1.19,Math.sin(a)*Math.sin(offset)*1.19,Math.sin(a)*Math.cos(offset)*1.19,-t*.45+ring*.4,.45,radius);
        i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);
      }
      c.strokeStyle=ring===0?'rgba(215,249,134,.28)':'rgba(136,217,221,.16)';c.lineWidth=.7;c.stroke();
      const a=t*(ring%2?-1:1)+ring*2.2;
      const p=project(Math.cos(a)*1.19,Math.sin(a)*Math.sin(offset)*1.19,Math.sin(a)*Math.cos(offset)*1.19,-t*.45+ring*.4,.45,radius);
      c.fillStyle='#d7f986';c.shadowColor='#d7f986';c.shadowBlur=12;c.beginPath();c.arc(p.x,p.y,2.8,0,Math.PI*2);c.fill();c.shadowBlur=0;
    }
  }
  function tick(now) {
    raf = 0;
    if (!running || document.hidden || !heroVisible || !context) {last=0;return;}
    if (!last || now-last>=32) {elapsed+=last?Math.min(now-last,60):0;last=now;draw();}
    raf=requestAnimationFrame(tick);
  }
  function startCanvas() {if(!raf&&running&&heroVisible&&!document.hidden&&context)raf=requestAnimationFrame(tick);}
  art.addEventListener('pointermove', e=>{
    if(!running||!finePointer.matches)return;
    const b=art.getBoundingClientRect();pointerX=(e.clientX-b.left)/b.width*2-1;pointerY=(e.clientY-b.top)/b.height*2-1;
  },{passive:true});
  art.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
  const targets=document.querySelectorAll('.hero-copy > *, .intelligence-art, .section-heading, .challenge-list li, .service-row, .example-row, .approach-grid article, .steps li, .company-teaser > div, .consultation-visual, .faq-list details, .contact-band-inner > *, .lab-intro, .lab-visual');
  function configure() {
    running=!manuallyPaused&&!preference.matches&&!printing;
    body.dataset.motion=running?'on':'off';
    body.dataset.richMotion='off'; // Disable the legacy decorative motion on this page.
    control.hidden=false;control.disabled=preference.matches;
    control.textContent=preference.matches?'端末設定で動きOFF':running?'動きを止める':'動きを再開';
    control.setAttribute('aria-pressed',String(!running));
    control.setAttribute('aria-label',control.textContent);
    animations.forEach(a=>a.cancel());animations.clear();
    observer?.disconnect();
    cancelAnimationFrame(raf);raf=0;last=0;
    if(running&&'IntersectionObserver'in window){
      observer=new IntersectionObserver(entries=>{
        let order=0;
        for(const entry of entries){
          if(!entry.isIntersecting||seen.has(entry.target))continue;
          seen.add(entry.target);observer.unobserve(entry.target);entry.target.classList.add('is-visible');
          animate(entry.target,[{opacity:0,transform:'translateY(30px)',filter:'blur(3px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0)'}],{duration:1000,delay:Math.min(order++*90,320),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
        }
      },{threshold:.08});
      targets.forEach(t=>{if(!seen.has(t))observer.observe(t);});
    }else targets.forEach(t=>t.classList.add('is-visible'));
    draw();startCanvas();queueScroll();
  }
  control.addEventListener('click',()=>{
    // Preserve reading position when the pinned narrative is disabled/enabled.
    const anchor=lab.getBoundingClientRect().top<84&&lab.getBoundingClientRect().bottom>84?lab:null;
    manuallyPaused=!manuallyPaused;
    try{localStorage.setItem('hso-ai-motion-paused',String(manuallyPaused));}catch{}
    configure();
    if(anchor)scrollTo({top:scrollY+anchor.getBoundingClientRect().top-84,behavior:'instant'});
  });
  preference.addEventListener('change',configure);
  addEventListener('beforeprint',()=>{printing=true;configure();});
  addEventListener('afterprint',()=>{printing=false;configure();});
  document.addEventListener('visibilitychange',()=>{
    body.dataset.pageHidden=String(document.hidden);
    if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;animations.forEach(a=>a.pause());}
    else{animations.forEach(a=>running?a.play():a.cancel());startCanvas();}
  });
  document.addEventListener('focusin',e=>animations.forEach(a=>{if(a.effect?.target?.contains(e.target))a.cancel();}));
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{
    heroVisible=entries[0].isIntersecting;
    if(heroVisible)startCanvas();else{cancelAnimationFrame(raf);raf=0;last=0;}
  },{rootMargin:'60px'}).observe(hero);
  if(context)art.classList.add('canvas-ready');
  if('ResizeObserver'in window)new ResizeObserver(()=>{sizeCanvas();queueScroll();}).observe(art);
  else addEventListener('resize',()=>{sizeCanvas();queueScroll();},{passive:true});
  sizeCanvas();configure();
})();
