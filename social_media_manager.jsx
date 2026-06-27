import { useState, useEffect, useCallback } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Background layers
const BG      = "#07070f";   // page background
const SURFACE = "#10101e";   // card background
const EDGE    = "#1c1c30";   // card border / divider
const LIFT    = "#181828";   // input / inner-card background

// Text hierarchy — all pass WCAG AA on BG/SURFACE
const T1 = "#f0f0f5";   // headings, primary values
const T2 = "#a0a0b8";   // body text, descriptions
const T3 = "#60607a";   // muted labels, timestamps, placeholders
const T4 = "#38384e";   // disabled / very muted (use sparingly, not for body)

// Brand accents
const PINK   = "#E1306C";
const PURPLE = "#833AB4";
const BLUE   = "#405DE6";
const GREEN  = "#00C98A";
const YELLOW = "#F5B800";
const RED    = "#F04444";

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
const SK = "smm_v1";
function load() { try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : null; } catch { return null; } }
function persist(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch {} }

// ─── CONTENT TYPE CONFIG ──────────────────────────────────────────────────────
const CONTENT_TYPES = {
  Reel: {
    icon:"🎬", color:PINK, primaryKPI:"views", kpiTarget:20000,
    kpiLabel:"Views", kpiNote:"20k–30k target",
    signalNote:"Watch time + saves + shares drive Reel distribution",
    schedules:[
      { id:"r_30m", label:"30-Min", icon:"⚡", timing:"30 min after posting", minH:0.4, maxH:4, urgency:"critical",
        why:"First 30 min = highest-weight window. Algorithm decides push based on initial velocity.",
        metrics:["views","likes","comments","shares","saves"],
        focusMetric:"views", focusNote:"Views in first 30 min signal viral potential" },
      { id:"r_2h", label:"2-Hour", icon:"🕑", timing:"2 hrs after posting", minH:1.8, maxH:10, urgency:"high",
        why:"Catch stalling Reels before algo deprioritises permanently. Watch time locks in here.",
        metrics:["views","likes","comments","shares","saves","reach"],
        focusMetric:"saves", focusNote:"Save rate >3% tells algo this content has lasting value" },
      { id:"r_24h", label:"24-Hour", icon:"📊", timing:"24 hrs after posting", minH:22, maxH:52, urgency:"medium",
        why:"Benchmark snapshot. Determines Explore eligibility and long-term recommendation.",
        metrics:["views","likes","comments","shares","saves","reach","profile_visits","new_follows"],
        focusMetric:"reach", focusNote:"Reach > followers = Explore/Reels feed picked it up" },
      { id:"r_72h", label:"72-Hour", icon:"🔬", timing:"3 days after posting", minH:68, maxH:104, urgency:"low",
        why:"Detect delayed virality. Reels pushed to Explore can spike days after posting.",
        metrics:["views","likes","saves","reach","new_follows"],
        focusMetric:"views", focusNote:"Growing views at 72h = Explore pickup — do not edit or delete" },
    ],
    studioFields:{
      hasAudio:true, hasWatchTime:true,
      structureLabel:"Reel Structure (beat by beat)",
      hookLabel:"Hook (0–3 seconds on screen)",
      coverLabel:"Thumbnail / Cover Frame",
    }
  },
  Post: {
    icon:"🖼️", color:BLUE, primaryKPI:"saves", kpiTarget:null,
    kpiLabel:"Saves", kpiNote:"Save rate >3% = strong",
    signalNote:"Saves + shares are the primary signal for single image Posts",
    schedules:[
      { id:"p_2h", label:"2-Hour", icon:"🕑", timing:"2 hrs after posting", minH:1.8, maxH:10, urgency:"critical",
        why:"Posts peak in the first 2 hrs. Save and share rate determines extended reach.",
        metrics:["likes","comments","shares","saves","reach"],
        focusMetric:"saves", focusNote:"Save rate in first 2hrs is the #1 Post signal" },
      { id:"p_24h", label:"24-Hour", icon:"📊", timing:"24 hrs after posting", minH:22, maxH:52, urgency:"high",
        why:"Final read on reach and engagement. Check profile visits converting to followers.",
        metrics:["likes","comments","shares","saves","reach","profile_visits","new_follows"],
        focusMetric:"reach", focusNote:"Reach beyond followers = Explore pickup" },
      { id:"p_7d", label:"7-Day", icon:"📅", timing:"7 days after posting", minH:160, maxH:200, urgency:"medium",
        why:"Posts with high saves get reshared for weeks. Check if reach is still growing.",
        metrics:["likes","comments","saves","reach","new_follows"],
        focusMetric:"new_follows", focusNote:"Delayed follower growth = content still circulating" },
    ],
    studioFields:{
      hasAudio:false, hasWatchTime:false,
      structureLabel:"Post Layout & Visual Hierarchy",
      hookLabel:"Visual Hook (what stops the scroll)",
      coverLabel:"Image Concept & Composition",
    }
  },
  Carousel: {
    icon:"📂", color:PURPLE, primaryKPI:"saves", kpiTarget:null,
    kpiLabel:"Saves", kpiNote:"Saves + swipe-through rate",
    signalNote:"Swipe-through rate + saves + shares drive Carousel distribution",
    schedules:[
      { id:"c_2h", label:"2-Hour", icon:"🕑", timing:"2 hrs after posting", minH:1.8, maxH:10, urgency:"critical",
        why:"Swipe-through rate in first 2hrs tells algo if slides are engaging enough to push.",
        metrics:["likes","comments","shares","saves","reach"],
        focusMetric:"saves", focusNote:"High saves = carousel being bookmarked = algo push" },
      { id:"c_24h", label:"24-Hour", icon:"📊", timing:"24 hrs after posting", minH:22, maxH:52, urgency:"high",
        why:"Carousels have longer peak windows. Profile visits converting to follows shows authority.",
        metrics:["likes","comments","shares","saves","reach","profile_visits","new_follows"],
        focusMetric:"shares", focusNote:"Carousel shares = being sent to others = strong signal" },
      { id:"c_7d", label:"7-Day", icon:"📅", timing:"7 days after posting", minH:160, maxH:200, urgency:"medium",
        why:"Carousels have the longest tail of any format. Save activity can last weeks.",
        metrics:["likes","comments","saves","reach","new_follows"],
        focusMetric:"reach", focusNote:"Reach still growing at 7d = carousel being reshared organically" },
    ],
    studioFields:{
      hasAudio:false, hasWatchTime:false,
      structureLabel:"Slide Structure (slide by slide)",
      hookLabel:"Slide 1 Hook (stop-the-scroll cover)",
      coverLabel:"Cover Slide Design",
    }
  }
};

const ALL_TYPES = ["Reel","Post","Carousel"];

const METRIC_META = {
  views:         { label:"Views",              icon:"👁️", ph:"e.g. 8500" },
  likes:         { label:"Likes",              icon:"❤️", ph:"e.g. 320"  },
  comments:      { label:"Comments",           icon:"💬", ph:"e.g. 28"   },
  saves:         { label:"Saves",              icon:"🔖", ph:"e.g. 190"  },
  shares:        { label:"Shares/Sends",       icon:"📤", ph:"e.g. 85"   },
  reach:         { label:"Reach (unique)",     icon:"📡", ph:"e.g. 3900" },
  profile_visits:{ label:"Profile Visits",     icon:"👤", ph:"e.g. 220"  },
  new_follows:   { label:"New Follows",        icon:"➕", ph:"e.g. 12"   },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spinner({ msg }) {
  return (
    <div style={{padding:"80px 0",textAlign:"center"}}>
      <div style={{width:44,height:44,border:`3px solid ${EDGE}`,borderTopColor:PINK,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 20px"}}/>
      <p style={{color:PINK,fontWeight:700,fontSize:15,margin:"0 0 6px"}}>{msg}</p>
      <p style={{color:T3,fontSize:13,margin:0}}>Using fresh research — not templates</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function TypeBadge({ type }) {
  const cfg = CONTENT_TYPES[type] || CONTENT_TYPES.Reel;
  return (
    <span style={{background:`${cfg.color}28`,color:cfg.color,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700,letterSpacing:0.2}}>
      {cfg.icon} {type}
    </span>
  );
}

// Reusable section block
function Block({ icon, label, color, children, style={} }) {
  return (
    <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:20,marginBottom:12,...style}}>
      <p style={{color:color||T3,fontWeight:700,fontSize:11,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1.2}}>
        {icon} {label}
      </p>
      {children}
    </div>
  );
}

// Reusable label
function Label({ children, color }) {
  return <p style={{color:color||T3,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,margin:"0 0 6px"}}>{children}</p>;
}

async function callClaude(sys, user, search=false) {
  const body={model:"claude-sonnet-4-6",max_tokens:1000,system:sys,messages:[{role:"user",content:user}]};
  if(search) body.tools=[{type:"web_search_20250305",name:"web_search"}];
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  const m=text.match(/\{[\s\S]*\}/);
  return m?JSON.parse(m[0]):null;
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const qs=[
    {id:"handle",     q:"Your Instagram handle",              ph:"@yourusername"},
    {id:"niche",      q:"Your content niche",                 ph:"e.g. Fitness, Finance, Food, Travel, Tech…"},
    {id:"followers",  q:"Current follower count",             ph:"e.g. 1,200"},
    {id:"goal",       q:"Your growth goal",                   ph:"e.g. 10,000 followers in 3 months"},
    {id:"audience",   q:"Who is your target audience?",       ph:"e.g. Women 25-35, interested in home workouts"},
    {id:"content_mix",q:"What content mix do you plan to post?", ph:"e.g. 4 Reels + 2 Carousels + 2 Posts/week"},
    {id:"competitors",q:"2–3 accounts you admire (optional)", ph:"e.g. @hubermanlab, @garyvee"},
  ];
  const [step,setStep]=useState(0);
  const [ans,setAns]=useState({});
  const q=qs[step]; const val=ans[q.id]||"";
  const next=()=>{
    if(!val.trim()&&step<qs.length-2) return;
    if(step+1<qs.length) setStep(s=>s+1); else onComplete(ans);
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:480}}>
        {/* Brand */}
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{display:"inline-flex",gap:5,marginBottom:16}}>
            {[PINK,PURPLE,BLUE,"#5851DB","#C13584"].map((c,i)=>(
              <div key={i} style={{width:10,height:10,borderRadius:"50%",background:c}}/>
            ))}
          </div>
          <h1 style={{color:T1,fontSize:26,fontWeight:800,margin:0,letterSpacing:-0.8}}>Social Media Manager</h1>
          <p style={{color:T3,fontSize:14,marginTop:8}}>📸 Instagram · Reels · Posts · Carousels</p>
        </div>

        {/* Progress */}
        <div style={{display:"flex",gap:5,marginBottom:28,justifyContent:"center"}}>
          {qs.map((_,i)=>(
            <div key={i} style={{width:i===step?28:8,height:8,borderRadius:4,background:i<=step?PINK:EDGE,transition:"all .3s"}}/>
          ))}
        </div>

        {/* Card */}
        <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:20,padding:"32px 28px"}}>
          <p style={{color:PINK,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",margin:"0 0 10px"}}>
            Step {step+1} of {qs.length}
          </p>
          <h2 style={{color:T1,fontSize:20,fontWeight:700,margin:"0 0 20px",lineHeight:1.4}}>{q.q}</h2>
          <input
            autoFocus value={val}
            onChange={e=>setAns({...ans,[q.id]:e.target.value})}
            onKeyDown={e=>e.key==="Enter"&&next()}
            placeholder={q.ph}
            style={{
              width:"100%",background:LIFT,border:`1px solid ${EDGE}`,borderRadius:12,
              padding:"14px 16px",color:T1,fontSize:16,outline:"none",
              boxSizing:"border-box",marginBottom:20,fontFamily:"inherit",
              "::placeholder":{color:T3}
            }}
          />
          <div style={{display:"flex",gap:10}}>
            <button onClick={next} style={{flex:1,background:`linear-gradient(135deg,${PINK},${PURPLE})`,border:"none",borderRadius:12,padding:14,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
              {step+1===qs.length?"Launch →":"Next →"}
            </button>
            {step>0&&(
              <button onClick={()=>setStep(s=>s-1)} style={{background:LIFT,border:`1px solid ${EDGE}`,borderRadius:12,padding:"14px 18px",color:T2,cursor:"pointer",fontSize:15}}>←</button>
            )}
          </div>
          {step===qs.length-1&&(
            <p style={{color:T3,fontSize:12,textAlign:"center",margin:"12px 0 0"}}>Optional — you can skip this one</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CONTENT STUDIO ───────────────────────────────────────────────────────────
function ContentStudio({ profile }) {
  const [type,setType]=useState("Reel");
  const [topic,setTopic]=useState("");
  const [ref,setRef]=useState("");
  const [stage,setStage]=useState("input");
  const [out,setOut]=useState(null);
  const [msg,setMsg]=useState("");
  const cfg=CONTENT_TYPES[type];

  const generate=async()=>{
    if(!topic.trim()) return;
    setStage("loading");
    const msgs=["🔍 Researching Instagram algo signals…","📈 Spotting trends in your niche…","🎯 Crafting hook options…","✍️ Building content brief…","🏷️ Researching hashtags…",type==="Reel"?"🎵 Checking trending audio…":"📐 Optimising structure…"];
    let mi=0; setMsg(msgs[0]);
    const iv=setInterval(()=>{mi=(mi+1)%msgs.length;setMsg(msgs[mi]);},2100);
    const typeSpecific=type==="Reel"
      ?`"audio_direction":"Type of audio trending for Reels in this niche right now",
        "how_to_find_audio":"Exact steps to find trending audio on Instagram",
        "watch_time_tip":"How to maximise watch time and loop completion",
        "loop_trick":"How to make this Reel loop seamlessly",`
      :type==="Carousel"
      ?`"slide_count":"Optimal number of slides for this topic and why",
        "slide1_design":"Cover slide design to maximise swipe-through rate",
        "swipe_hook":"What on slide 1 compels people to swipe to slide 2",
        "last_slide_cta":"What the last slide should say to drive saves and follows",
        "save_bait":"Explicit reason someone would save this carousel",`
      :`"visual_hook":"Specific composition or element that stops the scroll",
        "text_overlay":"If text on image — what it says and where",
        "caption_save_hook":"How to write caption so people save this post",`;
    try {
      const r=await callClaude(
        "You are an Instagram growth strategist. Do fresh research. Respond ONLY with valid JSON.",
        `Create a complete Instagram ${type} content brief:
Niche: ${profile.niche} | Handle: ${profile.handle} | Followers: ${profile.followers}
Audience: ${profile.audience} | Content mix: ${profile.content_mix||"N/A"}
Competitors: ${profile.competitors||"N/A"}
Topic: ${topic}
Reference: ${ref||"none"}

Return JSON (no markdown fences):
{
  "algo_insight":"What Instagram currently rewards for ${profile.niche} ${type}s in 2025",
  "hook":"${type==="Reel"?"Opening 0-3s on-screen text hook":type==="Carousel"?"Cover slide hook text":"Visual/caption hook that stops scroll"}",
  "hook_type":"category of hook used",
  "hook_rationale":"why this hook works right now",
  "hook_alts":["Alt 1","Alt 2","Alt 3"],
  "structure":${type==="Reel"?'["Beat 1 (0-5s):...","Beat 2 (5-15s):...","Beat 3 (15-30s):...","CTA (last 5s):..."]':type==="Carousel"?'["Slide 1 (cover):...","Slide 2:...","Slide 3:...","Slide 4:...","Last slide (CTA):..."]':'["Visual:...","Message:...","Caption structure:...","CTA:..."]'},
  ${typeSpecific}
  "caption_hook":"First visible line of caption before more",
  "full_caption":"Complete caption with CTA",
  "hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "hashtag_note":"Why these tags + strategy note",
  "cover_concept":"${type==="Reel"?"Thumbnail concept":"Cover image concept"}",
  "cover_style":"Visual style, colors, typography direction",
  "pin_comment":"What to pin as first comment after posting",
  "best_post_time":"Optimal time to post for this audience",
  "pre_post_actions":["Action before posting 1","Action 2"],
  "post_actions":["Do within 30 min of posting 1","Action 2","Action 3"],
  "kpi_boosters":["Action to hit target ${cfg.kpiLabel} 1","Action 2","Action 3","Action 4"],
  "follower_conversion_tip":"Specific way to convert viewers to followers",
  "engagement_prompt":"Question or prompt to drive comments",
  "suppress_risk":"What would suppress or shadowban this ${type}"
}`,true);
      clearInterval(iv);
      if(r){setOut({...r,_type:type,_topic:topic});setStage("result");}
      else setStage("input");
    } catch(e){clearInterval(iv);setStage("input");}
  };

  const reset=()=>{setStage("input");setOut(null);setTopic("");setRef("");};

  if(stage==="loading") return <Spinner msg={msg}/>;

  if(stage==="result"&&out){
    const t=out._type||type;
    const tcfg=CONTENT_TYPES[t]||cfg;
    return (
      <div style={{paddingBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:20,marginBottom:20}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <h2 style={{color:T1,margin:0,fontSize:20,fontWeight:800}}>Content Brief</h2>
              <TypeBadge type={t}/>
            </div>
            <p style={{color:T3,fontSize:13,margin:0}}>Topic: {out._topic}</p>
          </div>
          <button onClick={reset} style={{background:LIFT,border:`1px solid ${EDGE}`,borderRadius:10,padding:"9px 16px",color:T2,cursor:"pointer",fontSize:13,fontWeight:600}}>+ New</button>
        </div>

        <Block icon="📡" label="Algorithm Insight (Fresh Research)" color={PURPLE}>
          <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.75}}>{out.algo_insight}</p>
        </Block>

        <Block icon="⚡" label={tcfg.studioFields.hookLabel} color={tcfg.color}>
          <div style={{background:LIFT,borderRadius:10,padding:"14px 16px",marginBottom:12,border:`1px solid ${EDGE}`}}>
            <p style={{color:T1,fontSize:17,fontWeight:700,margin:"0 0 6px",lineHeight:1.4}}>"{out.hook}"</p>
            <p style={{color:T3,fontSize:13,margin:0}}>{out.hook_type} · {out.hook_rationale}</p>
          </div>
          <Label>Alternative Hooks</Label>
          {out.hook_alts?.map((h,i)=>(
            <p key={i} style={{color:T2,fontSize:13,margin:"0 0 6px",paddingLeft:12,borderLeft:`2px solid ${EDGE}`}}>"{h}"</p>
          ))}
        </Block>

        <Block icon="📋" label={tcfg.studioFields.structureLabel} color={BLUE}>
          {out.structure?.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<out.structure.length-1?`1px solid ${EDGE}`:"none"}}>
              <span style={{color:BLUE,fontWeight:700,fontSize:13,minWidth:18}}>{i+1}</span>
              <span style={{color:T2,fontSize:13,lineHeight:1.6}}>{s}</span>
            </div>
          ))}
        </Block>

        {/* Type-specific section */}
        {t==="Reel"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <Block icon="🎵" label="Trending Audio" color="#C13584" style={{marginBottom:0}}>
              <p style={{color:T2,fontSize:13,margin:"0 0 8px",lineHeight:1.6}}>{out.audio_direction}</p>
              <p style={{color:T3,fontSize:12,margin:0}}>{out.how_to_find_audio}</p>
            </Block>
            <Block icon="⏱️" label="Watch Time + Loop" color={PINK} style={{marginBottom:0}}>
              <p style={{color:T2,fontSize:13,margin:"0 0 8px"}}>{out.watch_time_tip}</p>
              <p style={{color:T3,fontSize:12,margin:0}}>Loop: {out.loop_trick}</p>
            </Block>
          </div>
        )}
        {t==="Carousel"&&(
          <Block icon="📂" label="Carousel Strategy" color={PURPLE}>
            {[["Slide count",out.slide_count],["Cover slide (Slide 1)",out.slide1_design],["Swipe hook",out.swipe_hook],["Last slide CTA",out.last_slide_cta],["Save bait",out.save_bait]].map(([k,v])=>v?(
              <div key={k} style={{marginBottom:10}}>
                <Label>{k}</Label>
                <p style={{color:T2,fontSize:13,margin:0}}>{v}</p>
              </div>
            ):null)}
          </Block>
        )}
        {t==="Post"&&(
          <Block icon="🖼️" label="Post-Specific Strategy" color={BLUE}>
            {[["Visual hook",out.visual_hook],["Text overlay",out.text_overlay],["Caption save-hook",out.caption_save_hook]].map(([k,v])=>v?(
              <div key={k} style={{marginBottom:10}}>
                <Label>{k}</Label>
                <p style={{color:T2,fontSize:13,margin:0}}>{v}</p>
              </div>
            ):null)}
          </Block>
        )}

        <Block icon="✍️" label="Caption" color="#C4A7FF">
          <Label color={tcfg.color}>First visible line (before "more")</Label>
          <div style={{background:LIFT,border:`1px solid ${EDGE}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <p style={{color:T1,fontSize:15,fontStyle:"italic",margin:0,lineHeight:1.6}}>"{out.caption_hook}"</p>
          </div>
          <Label>Full caption</Label>
          <p style={{color:T2,fontSize:14,margin:"0 0 12px",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{out.full_caption}</p>
          <div style={{background:LIFT,border:`1px solid ${EDGE}`,borderRadius:8,padding:"9px 12px"}}>
            <p style={{color:T3,fontSize:12,margin:0}}>Engagement prompt: <span style={{color:T2}}>"{out.engagement_prompt}"</span></p>
          </div>
        </Block>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Block icon="🏷️" label="Hashtags" color={GREEN} style={{marginBottom:0}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {out.hashtags?.map((h,i)=>(
                <span key={i} style={{background:`${GREEN}18`,border:`1px solid ${GREEN}40`,borderRadius:20,padding:"4px 11px",color:GREEN,fontSize:12,fontWeight:600}}>{h}</span>
              ))}
            </div>
            <p style={{color:T3,fontSize:12,margin:0}}>{out.hashtag_note}</p>
          </Block>
          <Block icon="🎨" label={tcfg.studioFields.coverLabel} color={YELLOW} style={{marginBottom:0}}>
            <p style={{color:T1,fontSize:14,fontWeight:700,margin:"0 0 8px",lineHeight:1.4}}>{out.cover_concept}</p>
            <p style={{color:T2,fontSize:12,margin:0}}>{out.cover_style}</p>
          </Block>
        </div>

        <Block icon="⏰" label="Posting Strategy" color={YELLOW}>
          <div style={{background:LIFT,border:`1px solid ${EDGE}`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
            <p style={{color:T1,fontWeight:700,margin:0,fontSize:14}}>⏰ Best time: {out.best_post_time}</p>
          </div>
          <Label color={tcfg.color}>Before posting</Label>
          {out.pre_post_actions?.map((a,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 5px"}}>• {a}</p>)}
          <Label color={PINK} style={{marginTop:12}}>Within 30 min of posting</Label>
          {out.post_actions?.map((a,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 5px"}}>→ {a}</p>)}
        </Block>

        <Block icon="🚀" label={`${tcfg.kpiLabel} Boosters — ${tcfg.kpiNote}`} color={tcfg.color}>
          {out.kpi_boosters?.map((a,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<out.kpi_boosters.length-1?`1px solid ${EDGE}`:"none",alignItems:"flex-start"}}>
              <span style={{color:tcfg.color,fontWeight:800,fontSize:14,minWidth:22}}>{i+1}.</span>
              <span style={{color:T2,fontSize:14,lineHeight:1.5}}>{a}</span>
            </div>
          ))}
        </Block>

        <Block icon="➕" label="Follower Conversion Tip" color={GREEN}>
          <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.7}}>{out.follower_conversion_tip}</p>
        </Block>

        <div style={{background:`${RED}12`,border:`1px solid ${RED}40`,borderRadius:14,padding:18,marginBottom:12}}>
          <p style={{color:RED,fontWeight:700,fontSize:11,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:1.2}}>🚫 Suppression Risk — Avoid This</p>
          <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.6}}>{out.suppress_risk}</p>
        </div>

        {out.pin_comment&&(
          <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:12,padding:16}}>
            <Label>📌 Pin as First Comment</Label>
            <p style={{color:T2,fontSize:14,margin:0}}>"{out.pin_comment}"</p>
          </div>
        )}
      </div>
    );
  }

  // Input view
  return (
    <div style={{padding:"20px 0"}}>
      <h2 style={{color:T1,margin:"0 0 6px",fontSize:20,fontWeight:800}}>Content Studio</h2>
      <p style={{color:T2,fontSize:14,margin:"0 0 24px",lineHeight:1.6}}>
        Reels · Posts · Carousels — each gets type-specific strategy with fresh research.
      </p>

      {/* Type selector */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {ALL_TYPES.map(t=>{
          const c=CONTENT_TYPES[t]; const sel=type===t;
          return (
            <button key={t} onClick={()=>setType(t)} style={{
              background:sel?`${c.color}20`:SURFACE,
              border:`1px solid ${sel?c.color:EDGE}`,
              borderRadius:12,padding:"14px 8px",cursor:"pointer",textAlign:"center",transition:"all .15s"
            }}>
              <div style={{fontSize:22,marginBottom:6}}>{c.icon}</div>
              <div style={{color:sel?c.color:T2,fontWeight:700,fontSize:14}}>{t}</div>
              <div style={{color:T3,fontSize:11,marginTop:3}}>{c.kpiNote}</div>
            </button>
          );
        })}
      </div>

      {/* Signal note */}
      <div style={{background:`${cfg.color}14`,border:`1px solid ${cfg.color}35`,borderRadius:10,padding:"11px 14px",marginBottom:20}}>
        <p style={{color:cfg.color,fontSize:13,margin:0,fontWeight:600}}>📡 {type} key signal: {cfg.signalNote}</p>
      </div>

      <div style={{marginBottom:16}}>
        <label style={{color:T2,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>
          {type==="Reel"?"Reel topic / idea":type==="Carousel"?"Carousel topic / idea":"Post concept"} *
        </label>
        <textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3}
          placeholder={type==="Reel"?`e.g. "3 things I wish I knew before starting my ${profile.niche||"content"} journey"`:type==="Carousel"?`e.g. "10 ${profile.niche||"Instagram"} mistakes killing your reach"`:`e.g. "Sharing a result or announcement about ${profile.niche||"my niche"}"`}
          style={{width:"100%",background:LIFT,border:`1px solid ${EDGE}`,borderRadius:12,padding:14,color:T1,fontSize:15,resize:"vertical",outline:"none",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.6}}/>
      </div>

      <div style={{marginBottom:24}}>
        <label style={{color:T2,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>Reference / inspiration (optional)</label>
        <textarea value={ref} onChange={e=>setRef(e.target.value)} rows={2}
          placeholder="Paste a link OR describe the style. Note: I can't open private Instagram links — describe the vibe instead."
          style={{width:"100%",background:LIFT,border:`1px solid ${EDGE}`,borderRadius:12,padding:14,color:T1,fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
      </div>

      <button onClick={generate} disabled={!topic.trim()} style={{
        width:"100%",
        background:topic.trim()?`linear-gradient(135deg,${cfg.color},${PURPLE})`:`${LIFT}`,
        border:`1px solid ${topic.trim()?cfg.color:EDGE}`,
        borderRadius:12,padding:16,color:topic.trim()?T1:T3,fontWeight:800,fontSize:16,cursor:topic.trim()?"pointer":"not-allowed"
      }}>
        Research + Generate {type} Brief →
      </button>
    </div>
  );
}

// ─── CHECK-IN FLOW ────────────────────────────────────────────────────────────
function CheckinFlow({ content, schedule, profile, onComplete, onBack }) {
  const [vals,setVals]=useState({});
  const [stage,setStage]=useState("form");
  const [result,setResult]=useState(null);
  const [msg,setMsg]=useState("");
  const tcfg=CONTENT_TYPES[content.contentType]||CONTENT_TYPES.Reel;

  const submit=async()=>{
    setStage("loading"); setMsg("Analyzing your metrics…");
    const msgs=["Comparing against niche benchmarks…","Identifying algorithm signals…","Measuring tip effectiveness…","Building action plan…"];
    let mi=0; const iv=setInterval(()=>{mi=(mi+1)%msgs.length;setMsg(msgs[mi]);},2100);
    const prevActions=(content.logs||[]).flatMap(l=>l.actions||[]);
    try {
      const r=await callClaude(
        "You are a precise Instagram performance analyst. Respond ONLY with valid JSON.",
        `Account: ${profile.handle} | Niche: ${profile.niche} | Followers: ${profile.followers} | Goal: ${profile.goal}
Content: "${content.title}" (${content.contentType})
Check-in: ${schedule.label} (${schedule.timing})
Primary KPI for ${content.contentType}: ${tcfg.kpiLabel} — ${tcfg.kpiNote}
Algorithm signal: ${tcfg.signalNote}
Focus metric this check-in: ${schedule.focusMetric} — ${schedule.focusNote}
Metrics logged: ${Object.entries(vals).map(([k,v])=>`${k}: ${v}`).join(", ")}
Previous tips given: ${prevActions.length?prevActions.join("; "):"None yet — first check-in"}

Return JSON:
{
  "score":"🔥 Viral|✅ On Track|⚠️ Below Target|❌ Needs Help",
  "score_pct":75,
  "headline":"Bold one-sentence summary",
  "what_algo_sees":"What Instagram is doing with this ${content.contentType} based on these numbers",
  "focus_verdict":"Verdict on ${schedule.focusMetric} — strong/ok/low vs benchmark",
  "key_ratios":[{"name":"ratio","value":"x%","benchmark":"good is >x","status":"good|ok|low"}],
  "tip_effectiveness":${prevActions.length?`[{"tip":"previous tip","likely_impact":"what it probably achieved"}]`:"[]"},
  "do_now":[{"action":"Exact step in next 15 min","why":"algorithm reason"}],
  "do_today":["Action 1","Action 2"],
  "do_this_week":["Action 1","Action 2"],
  "follower_tip":"How to convert viewers to followers RIGHT NOW",
  "reach_booster":"One action to expand reach beyond current audience",
  "avoid_now":"What would hurt performance right now",
  "next_checkin_focus":"What to watch at the next check-in",
  "projected":"Estimated performance at next milestone if plan followed"
}`);
      clearInterval(iv);
      if(r){
        setResult(r); setStage("result");
        onComplete(schedule.id,vals,r);
      }
    } catch(e){clearInterval(iv);setStage("form");}
  };

  if(stage==="loading") return <Spinner msg={msg}/>;

  if(stage==="result"&&result){
    const sc=result.score||"";
    const col=sc.includes("🔥")?GREEN:sc.includes("✅")?"#4CAF50":sc.includes("⚠️")?YELLOW:RED;
    const pct=Math.min(100,Math.max(0,result.score_pct||50));
    return (
      <div style={{paddingTop:20}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T3,cursor:"pointer",fontSize:13,marginBottom:18,padding:0,fontWeight:600}}>← Back</button>

        {/* Score card */}
        <div style={{background:`${col}14`,border:`1px solid ${col}40`,borderRadius:16,padding:24,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{color:col,fontWeight:800,fontSize:24,marginBottom:6}}>{result.score}</div>
              <div style={{color:T1,fontSize:15,fontWeight:600,lineHeight:1.5}}>{result.headline}</div>
            </div>
            <div style={{textAlign:"center",background:`${col}20`,borderRadius:12,padding:"10px 14px",minWidth:60}}>
              <div style={{color:col,fontSize:30,fontWeight:900,lineHeight:1}}>{pct}</div>
              <div style={{color:T3,fontSize:10,textTransform:"uppercase",marginTop:2}}>/100</div>
            </div>
          </div>
          <div style={{background:`${col}20`,borderRadius:100,height:6,marginTop:16}}>
            <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:100,transition:"width .8s ease"}}/>
          </div>
        </div>

        {/* Focus metric */}
        <div style={{background:`${tcfg.color}14`,border:`1px solid ${tcfg.color}40`,borderRadius:12,padding:16,marginBottom:14}}>
          <p style={{color:tcfg.color,fontWeight:700,fontSize:11,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:1.2}}>🎯 Focus: {schedule.focusMetric.toUpperCase()}</p>
          <p style={{color:T2,fontSize:14,margin:0}}>{result.focus_verdict}</p>
        </div>

        <Block icon="📡" label="What the Algorithm Sees" color={PURPLE}>
          <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.75}}>{result.what_algo_sees}</p>
        </Block>

        {result.key_ratios?.length>0&&(
          <Block icon="📐" label="Key Ratios" color={T3}>
            {result.key_ratios.map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<result.key_ratios.length-1?`1px solid ${EDGE}`:"none"}}>
                <span style={{color:T2,fontSize:14}}>{r.name}</span>
                <div style={{textAlign:"right"}}>
                  <span style={{color:r.status==="good"?GREEN:r.status==="ok"?YELLOW:RED,fontWeight:700,fontSize:15}}>{r.value}</span>
                  <span style={{color:T3,fontSize:11,display:"block"}}>bench: {r.benchmark}</span>
                </div>
              </div>
            ))}
          </Block>
        )}

        {result.tip_effectiveness?.length>0&&(
          <Block icon="🎯" label="Previous Tip Effectiveness" color="#C4A7FF">
            {result.tip_effectiveness.map((t,i)=>(
              <div key={i} style={{marginBottom:i<result.tip_effectiveness.length-1?14:0,paddingBottom:i<result.tip_effectiveness.length-1?14:0,borderBottom:i<result.tip_effectiveness.length-1?`1px solid ${EDGE}`:"none"}}>
                <p style={{color:T3,fontSize:12,fontStyle:"italic",margin:"0 0 5px"}}>"{t.tip}"</p>
                <p style={{color:T2,fontSize:13,margin:0}}>→ {t.likely_impact}</p>
              </div>
            ))}
          </Block>
        )}

        <div style={{background:`${RED}12`,border:`1px solid ${RED}35`,borderRadius:14,padding:20,marginBottom:12}}>
          <p style={{color:RED,fontWeight:700,fontSize:11,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1.2}}>⚡ Do RIGHT NOW</p>
          {result.do_now?.map((item,i)=>(
            <div key={i} style={{marginBottom:i<result.do_now.length-1?14:0}}>
              <div style={{color:T1,fontSize:14,fontWeight:700,marginBottom:4}}>→ {item.action}</div>
              <div style={{color:T3,fontSize:13}}>Why: {item.why}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Block icon="🕐" label="Do Today" color={YELLOW} style={{marginBottom:0}}>
            {result.do_today?.map((a,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 6px"}}>• {a}</p>)}
          </Block>
          <Block icon="📅" label="This Week" color={BLUE} style={{marginBottom:0}}>
            {result.do_this_week?.map((a,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 6px"}}>• {a}</p>)}
          </Block>
        </div>

        <Block icon="➕" label="Follower Conversion + Reach" color={GREEN}>
          <Label color={GREEN}>Convert viewers to followers</Label>
          <p style={{color:T2,fontSize:14,margin:"0 0 14px"}}>{result.follower_tip}</p>
          <Label color={BLUE}>Reach booster</Label>
          <p style={{color:T2,fontSize:14,margin:0}}>{result.reach_booster}</p>
        </Block>

        <div style={{background:`${YELLOW}10`,border:`1px solid ${YELLOW}30`,borderRadius:14,padding:16,marginBottom:12}}>
          <p style={{color:YELLOW,fontWeight:700,fontSize:11,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:1.2}}>🚫 Avoid Now</p>
          <p style={{color:T2,fontSize:14,margin:0}}>{result.avoid_now}</p>
        </div>

        <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:12,padding:14}}>
          <p style={{color:T3,fontSize:13,margin:"0 0 4px"}}>Next check-in focus: <span style={{color:T2,fontWeight:600}}>{result.next_checkin_focus}</span></p>
          {result.projected&&<p style={{color:T3,fontSize:13,margin:0}}>Projected: <span style={{color:T2}}>{result.projected}</span></p>}
        </div>
      </div>
    );
  }

  // Metric entry form
  const filled=schedule.metrics.filter(m=>vals[m]?.toString().trim()).length;
  return (
    <div style={{paddingTop:20}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:T3,cursor:"pointer",fontSize:13,marginBottom:18,padding:0,fontWeight:600}}>← Back</button>

      <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:20,marginBottom:16}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:28}}>{schedule.icon}</span>
          <div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
              <h3 style={{color:T1,margin:0,fontSize:17,fontWeight:700}}>{schedule.label} Check-in</h3>
              <TypeBadge type={content.contentType}/>
            </div>
            <p style={{color:tcfg.color,margin:"0 0 5px",fontSize:14,fontWeight:600}}>"{content.title}"</p>
            <p style={{color:T2,margin:0,fontSize:13}}>{schedule.why}</p>
          </div>
        </div>
      </div>

      {/* Focus metric callout */}
      <div style={{background:`${tcfg.color}14`,border:`1px solid ${tcfg.color}40`,borderRadius:12,padding:14,marginBottom:14}}>
        <p style={{color:tcfg.color,fontWeight:700,fontSize:13,margin:"0 0 4px"}}>★ Focus metric: {schedule.focusMetric.toUpperCase()}</p>
        <p style={{color:T2,fontSize:13,margin:0}}>{schedule.focusNote}</p>
      </div>

      {/* Where to find */}
      <div style={{background:`${YELLOW}10`,border:`1px solid ${YELLOW}28`,borderRadius:12,padding:14,marginBottom:18}}>
        <p style={{color:YELLOW,fontWeight:700,fontSize:12,margin:"0 0 5px"}}>📍 How to find these — 60 seconds</p>
        <p style={{color:T2,fontSize:13,margin:0}}>
          Open Instagram → go to your {content.contentType} → tap <strong style={{color:T1}}>View Insights</strong> below the post.
        </p>
      </div>

      {/* Metrics grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {schedule.metrics.map(m=>{
          const meta=METRIC_META[m]||{label:m,icon:"📊",ph:"number"};
          const isFocus=m===schedule.focusMetric;
          return (
            <div key={m}>
              <label style={{color:isFocus?tcfg.color:T2,fontSize:13,display:"block",marginBottom:6,fontWeight:isFocus?700:500}}>
                {meta.icon} {meta.label}{isFocus?" ★":""}
              </label>
              <input
                value={vals[m]||""} onChange={e=>setVals({...vals,[m]:e.target.value})}
                placeholder={meta.ph} type="number"
                style={{
                  width:"100%",background:LIFT,
                  border:`1.5px solid ${vals[m]?tcfg.color:EDGE}`,
                  borderRadius:10,padding:"12px 13px",color:T1,fontSize:15,
                  outline:"none",boxSizing:"border-box",fontFamily:"inherit"
                }}
              />
              {m==="views"&&vals.views&&(
                <p style={{color:parseInt(vals.views)>=20000?GREEN:parseInt(vals.views)>=5000?YELLOW:RED,fontSize:11,margin:"4px 0 0",fontWeight:600}}>
                  {parseInt(vals.views)>=20000?"🔥 Hit 20k target!":parseInt(vals.views)>=5000?"📈 Building momentum":"⚠️ Below 20k target"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={submit} disabled={filled<1} style={{
        width:"100%",
        background:filled>=1?`linear-gradient(135deg,${tcfg.color},${PURPLE})`:LIFT,
        border:`1px solid ${filled>=1?tcfg.color:EDGE}`,
        borderRadius:12,padding:16,color:filled>=1?T1:T3,fontWeight:700,fontSize:16,cursor:filled>=1?"pointer":"not-allowed"
      }}>
        Analyze & Get Action Plan →
      </button>
    </div>
  );
}

// ─── CHECK-INS TAB ────────────────────────────────────────────────────────────
function CheckinsTab({ contents, setContents, profile }) {
  const [active,setActive]=useState(null);
  const now=Date.now();

  const getDue=()=>{
    const due=[];
    contents.forEach(c=>{
      const hrs=(now-new Date(c.postedAt).getTime())/3600000;
      const cfg=CONTENT_TYPES[c.contentType]||CONTENT_TYPES.Reel;
      cfg.schedules.forEach(s=>{
        const done=(c.logs||[]).some(l=>l.checkInId===s.id);
        if(hrs>=s.minH&&hrs<=s.maxH&&!done) due.push({content:c,schedule:s});
      });
    });
    return due;
  };

  const handleComplete=(contentId,checkInId,metrics,analysis)=>{
    setContents(prev=>prev.map(c=>c.id!==contentId?c:{
      ...c,
      logs:[...(c.logs||[]),{
        checkInId,metrics,analysis,
        actions:[...(analysis.do_now||[]).map(d=>d.action),...(analysis.do_today||[])],
        loggedAt:new Date().toISOString()
      }]
    }));
    setActive(null);
  };

  const due=getDue();

  if(active) return (
    <CheckinFlow content={active.content} schedule={active.schedule} profile={profile}
      onComplete={(cid,m,a)=>handleComplete(active.content.id,cid,m,a)}
      onBack={()=>setActive(null)}/>
  );

  return (
    <div style={{padding:"20px 0"}}>
      <h2 style={{color:T1,margin:"0 0 6px",fontSize:20,fontWeight:800}}>Check-ins</h2>
      <p style={{color:T2,fontSize:14,margin:"0 0 24px"}}>
        {due.length>0?`${due.length} due now — log metrics, get your action plan`:"All caught up — check back after your next post"}
      </p>

      {due.map((item,i)=>{
        const tcfg=CONTENT_TYPES[item.content.contentType]||CONTENT_TYPES.Reel;
        const urgCol=item.schedule.urgency==="critical"?tcfg.color:item.schedule.urgency==="high"?YELLOW:T4;
        return (
          <div key={i} onClick={()=>setActive(item)} style={{
            background:SURFACE,
            border:`1px solid ${item.schedule.urgency==="critical"?`${tcfg.color}60`:item.schedule.urgency==="high"?`${YELLOW}40`:EDGE}`,
            borderRadius:14,padding:18,marginBottom:12,cursor:"pointer",display:"flex",gap:14,alignItems:"center",
            transition:"border-color .15s"
          }}>
            <span style={{fontSize:28}}>{item.schedule.icon}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:T1,fontWeight:700,fontSize:15}}>{item.schedule.label}</span>
                  <TypeBadge type={item.content.contentType}/>
                </div>
                <span style={{background:`${urgCol}25`,color:urgCol,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:700}}>
                  {item.schedule.urgency==="critical"?"NOW":item.schedule.urgency==="high"?"SOON":"DUE"}
                </span>
              </div>
              <p style={{color:tcfg.color,margin:"0 0 3px",fontSize:14,fontWeight:600}}>"{item.content.title}"</p>
              <p style={{color:T3,margin:0,fontSize:13}}>{item.schedule.timing} · Focus: {item.schedule.focusMetric}</p>
            </div>
            <span style={{color:T3,fontSize:20}}>›</span>
          </div>
        );
      })}

      {due.length===0&&contents.length>0&&(
        <div style={{textAlign:"center",padding:"50px 0"}}>
          <div style={{fontSize:44,marginBottom:14}}>✅</div>
          <p style={{color:T2,fontSize:15,margin:0}}>All check-ins complete for now</p>
          <p style={{color:T3,fontSize:13,marginTop:6}}>Check back after your next post</p>
        </div>
      )}
      {contents.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:44,marginBottom:14}}>📊</div>
          <p style={{color:T2,fontSize:15,margin:0}}>No content tracked yet</p>
          <p style={{color:T3,fontSize:13,marginTop:6}}>Log content in the Tracker tab after you publish</p>
        </div>
      )}

      {/* Schedule reference */}
      {contents.length>0&&(
        <div style={{marginTop:32}}>
          <p style={{color:T3,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px"}}>Check-in schedule by type</p>
          {ALL_TYPES.map(ct=>{
            const c=CONTENT_TYPES[ct];
            return (
              <div key={ct} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>{c.icon}</span>
                  <span style={{color:c.color,fontWeight:700,fontSize:14}}>{ct}</span>
                  <span style={{color:T3,fontSize:12}}>· {c.signalNote}</span>
                </div>
                {c.schedules.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"8px 0 8px 26px",borderBottom:`1px solid ${EDGE}`}}>
                    <span style={{fontSize:14}}>{s.icon}</span>
                    <span style={{color:T2,fontSize:13}}>{s.label}</span>
                    <span style={{color:T3,fontSize:13}}>· {s.timing}</span>
                    <span style={{color:T3,fontSize:13}}>· Focus: {s.focusMetric}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CONTENT TRACKER ─────────────────────────────────────────────────────────
function TrackerTab({ contents, setContents }) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({title:"",contentType:"Reel",postedAt:new Date().toISOString().slice(0,16)});

  const add=()=>{
    if(!form.title.trim()) return;
    setContents(prev=>[...prev,{...form,id:Date.now().toString(),logs:[]}]);
    setForm({title:"",contentType:"Reel",postedAt:new Date().toISOString().slice(0,16)});
    setShowAdd(false);
  };

  const getLatest=(c,metric)=>{
    const logs=c.logs||[];
    for(let i=logs.length-1;i>=0;i--){const v=logs[i].metrics?.[metric];if(v) return parseInt(v);}
    return null;
  };

  return (
    <div style={{padding:"20px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{color:T1,margin:"0 0 4px",fontSize:20,fontWeight:800}}>Content Tracker</h2>
          <p style={{color:T2,fontSize:14,margin:0}}>Log Reels, Posts & Carousels after publishing</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{background:`linear-gradient(135deg,${PINK},${PURPLE})`,border:"none",borderRadius:10,padding:"10px 18px",color:T1,cursor:"pointer",fontWeight:700,fontSize:14}}>
          + Log Content
        </button>
      </div>

      {showAdd&&(
        <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:22,marginBottom:20}}>
          <p style={{color:"#C4A7FF",fontWeight:700,fontSize:12,margin:"0 0 18px",textTransform:"uppercase",letterSpacing:1}}>Log New Content</p>
          <div style={{display:"grid",gap:14}}>
            <div>
              <label style={{color:T2,fontSize:13,fontWeight:600,display:"block",marginBottom:7}}>Topic / title *</label>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                placeholder="e.g. 5 habits that changed my morning routine"
                style={{width:"100%",background:LIFT,border:`1px solid ${EDGE}`,borderRadius:10,padding:"13px 14px",color:T1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{color:T2,fontSize:13,fontWeight:600,display:"block",marginBottom:8}}>Content type</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {ALL_TYPES.map(t=>{
                  const c=CONTENT_TYPES[t]; const sel=form.contentType===t;
                  return (
                    <button key={t} onClick={()=>setForm({...form,contentType:t})} style={{
                      background:sel?`${c.color}20`:LIFT,border:`1px solid ${sel?c.color:EDGE}`,
                      borderRadius:10,padding:"12px 6px",cursor:"pointer",textAlign:"center"
                    }}>
                      <div style={{fontSize:20}}>{c.icon}</div>
                      <div style={{color:sel?c.color:T2,fontWeight:700,fontSize:13,marginTop:4}}>{t}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{color:T2,fontSize:13,fontWeight:600,display:"block",marginBottom:7}}>Posted at</label>
              <input type="datetime-local" value={form.postedAt} onChange={e=>setForm({...form,postedAt:e.target.value})}
                style={{width:"100%",background:LIFT,border:`1px solid ${EDGE}`,borderRadius:10,padding:"13px 14px",color:T1,fontSize:14,outline:"none",boxSizing:"border-box",colorScheme:"dark"}}/>
            </div>
            <button onClick={add} style={{background:`linear-gradient(135deg,${PINK},${PURPLE})`,border:"none",borderRadius:10,padding:"13px",color:T1,fontWeight:700,fontSize:15,cursor:"pointer"}}>
              Start Tracking →
            </button>
          </div>
        </div>
      )}

      {contents.length===0&&!showAdd&&(
        <div style={{textAlign:"center",padding:"70px 0"}}>
          <div style={{fontSize:50,marginBottom:16}}>📊</div>
          <p style={{color:T2,fontSize:15,margin:0,fontWeight:600}}>No content tracked yet</p>
          <p style={{color:T3,fontSize:13,marginTop:8}}>Log content right after you publish — the check-in clock starts immediately</p>
        </div>
      )}

      <div style={{display:"grid",gap:12}}>
        {contents.slice().reverse().map(c=>{
          const cfg=CONTENT_TYPES[c.contentType]||CONTENT_TYPES.Reel;
          const views=getLatest(c,"views"), saves=getLatest(c,"saves"), follows=getLatest(c,"new_follows"), likes=getLatest(c,"likes");
          const logs=c.logs||[];
          const hrs=Math.round((Date.now()-new Date(c.postedAt).getTime())/3600000);
          const primaryVal=c.contentType==="Reel"?views:saves;
          const onTarget=c.contentType==="Reel"?views>=20000:saves>0;
          const kpiCol=c.contentType==="Reel"?(views>=20000?GREEN:views>=5000?YELLOW:views?RED:T4):(saves>0?GREEN:T4);

          return (
            <div key={c.id} style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{marginBottom:6}}><TypeBadge type={c.contentType}/></div>
                  <h4 style={{color:T1,margin:"0 0 4px",fontSize:15,fontWeight:700}}>"{c.title}"</h4>
                  <p style={{color:T3,fontSize:13,margin:0}}>{hrs<24?`${hrs}h ago`:`${Math.round(hrs/24)}d ago`}</p>
                </div>
                {primaryVal!=null&&(
                  <div style={{textAlign:"right"}}>
                    <div style={{color:kpiCol,fontWeight:800,fontSize:22,lineHeight:1}}>{primaryVal.toLocaleString()}</div>
                    <div style={{color:T3,fontSize:11,marginTop:2}}>{cfg.kpiLabel}</div>
                    {onTarget&&c.contentType==="Reel"&&<div style={{color:GREEN,fontSize:10,fontWeight:700,marginTop:2}}>✓ TARGET HIT</div>}
                  </div>
                )}
              </div>

              {/* Metric row */}
              <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:14}}>
                {[["👁️",views,"views"],["❤️",likes,"likes"],["🔖",saves,"saves"],["➕",follows,"follows"]].map(([icon,val,label])=>
                  val!=null?<span key={label} style={{color:T2,fontSize:13}}>{icon} {val.toLocaleString()} {label}</span>:null
                )}
              </div>

              {/* Check-in progress dots */}
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                {cfg.schedules.map((s,i)=>{
                  const done=logs.some(l=>l.checkInId===s.id);
                  return (
                    <div key={i} title={s.label} style={{
                      width:28,height:28,borderRadius:"50%",
                      background:done?cfg.color:LIFT,
                      border:`1.5px solid ${done?cfg.color:EDGE}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,color:done?"#fff":T3,fontWeight:700
                    }}>{done?"✓":s.icon}</div>
                  );
                })}
                <span style={{color:T3,fontSize:12,marginLeft:4}}>{logs.length}/{cfg.schedules.length} check-ins done</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MI DASHBOARD ─────────────────────────────────────────────────────────────
function MIDashboard({ contents, profile }) {
  const [miData,setMiData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");

  const allLogs=contents.flatMap(c=>(c.logs||[]).map(l=>({...l,contentType:c.contentType,title:c.title})));
  const allTips=allLogs.flatMap(l=>l.actions||[]);
  const totalFollows=allLogs.reduce((s,l)=>s+parseInt(l.metrics?.new_follows||0),0);

  const typeStats=ALL_TYPES.map(t=>{
    const items=contents.filter(c=>c.contentType===t);
    const c=CONTENT_TYPES[t];
    const withData=items.filter(ci=>(ci.logs||[]).some(l=>l.metrics?.[c.primaryKPI]));
    const avgKPI=withData.length?Math.round(withData.reduce((s,ci)=>{
      const vals=(ci.logs||[]).map(l=>parseInt(l.metrics?.[c.primaryKPI]||0)).filter(Boolean);
      return s+(vals.length?Math.max(...vals):0);
    },0)/withData.length):null;
    const hits=c.primaryKPI==="views"?items.filter(ci=>(ci.logs||[]).some(l=>parseInt(l.metrics?.views||0)>=20000)).length:null;
    return {type:t,count:items.length,avgKPI,hits,cfg:c};
  });

  const generateMI=async()=>{
    if(contents.length===0) return;
    setLoading(true);
    const msgs=["Compiling all tip + metrics data…","Measuring outcomes vs suggestions…","Calculating what worked…","Building MI report…"];
    let mi=0; setMsg(msgs[0]);
    const iv=setInterval(()=>{mi=(mi+1)%msgs.length;setMsg(msgs[mi]);},2100);
    try {
      const r=await callClaude(
        "You are a Marketing Intelligence analyst. Respond ONLY with valid JSON.",
        `Account: ${profile.handle} | Niche: ${profile.niche} | Followers: ${profile.followers} | Goal: ${profile.goal}
Content tracked: ${typeStats.map(t=>`${t.count} ${t.type}s`).join(", ")}
Total check-ins: ${allLogs.length} | Follows from content: ${totalFollows} | Tips given: ${allTips.length}
Per-type: ${typeStats.map(t=>`${t.type}: avg ${t.cfg.kpiLabel} ${t.avgKPI||"no data"}${t.hits!=null?`, ${t.hits} hit 20k`:""}`).join("; ")}
All tips: ${allTips.slice(0,30).join("; ")}

Return JSON:
{
  "overall_grade":"A+|A|B|C|D",
  "grade_note":"One line trajectory",
  "growth_velocity":"Accelerating|Steady|Slowing|Stalled",
  "velocity_note":"What is driving or blocking growth",
  "content_type_breakdown":[{"type":"Reel|Post|Carousel","count":0,"avg_kpi":"...","kpi_label":"...","verdict":"Strong|OK|Weak|No data","strength":"...","advice":"..."}],
  "tip_effectiveness":[{"category":"...","estimated_impact":"...","evidence":"...","verdict":"Do More|Modify|Stop"}],
  "what_worked":[{"action":"...","metric_proof":"..."}],
  "what_didnt_work":[{"action":"...","why":"...","pivot":"..."}],
  "follower_growth_analysis":"Analysis of follows gained per content type",
  "reach_trend":"What reach numbers reveal about algorithmic distribution",
  "top_3_wins":["Win 1","Win 2","Win 3"],
  "top_3_gaps":["Gap 1","Gap 2","Gap 3"],
  "content_mix_recommendation":"Optimal Reel/Post/Carousel ratio based on data",
  "next_30_days":["Priority 1","Priority 2","Priority 3","Priority 4"],
  "projected_growth":"Realistic follower projection for next 30 days"
}`);
      clearInterval(iv);
      if(r) setMiData(r);
    } catch(e){clearInterval(iv);}
    setLoading(false);
  };

  const gradeCol={"A+":GREEN,A:"#4CAF50",B:YELLOW,C:"#FF9800",D:RED};
  const velCol={Accelerating:GREEN,Steady:"#4CAF50",Slowing:YELLOW,Stalled:RED};
  const verdictCol={Strong:GREEN,OK:YELLOW,Weak:RED,"No data":T3};

  return (
    <div style={{padding:"20px 0"}}>
      <h2 style={{color:T1,margin:"0 0 6px",fontSize:20,fontWeight:800}}>MI Dashboard</h2>
      <p style={{color:T2,fontSize:14,margin:"0 0 24px",lineHeight:1.6}}>
        Marketing Intelligence — every suggestion tracked against actual outcomes, across all content types.
      </p>

      {/* Live stats — 3+3 grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {label:"Total Content",val:contents.length,col:"#C4A7FF",sub:"Tracked"},
          {label:"Check-ins Done",val:allLogs.length,col:BLUE,sub:"Completed"},
          {label:"Follows Gained",val:totalFollows||"—",col:totalFollows?GREEN:T3,sub:"From content"},
        ].map((s,i)=>(
          <div key={i} style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:16,textAlign:"center"}}>
            <div style={{color:s.col,fontWeight:800,fontSize:22,lineHeight:1}}>{s.val}</div>
            <div style={{color:T3,fontSize:11,margin:"5px 0 3px",textTransform:"uppercase",letterSpacing:0.5,fontWeight:600}}>{s.label}</div>
            <div style={{color:s.col,fontSize:11,opacity:0.8}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Per-type stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {typeStats.map((ts,i)=>(
          <div key={i} style={{background:SURFACE,border:`1px solid ${ts.cfg.color}35`,borderRadius:14,padding:16,textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:6}}>{ts.cfg.icon}</div>
            <div style={{color:ts.cfg.color,fontWeight:800,fontSize:20,lineHeight:1}}>{ts.avgKPI!=null?ts.avgKPI.toLocaleString():"—"}</div>
            <div style={{color:T3,fontSize:11,margin:"4px 0 2px",fontWeight:600}}>Avg {ts.cfg.kpiLabel}</div>
            <div style={{color:T3,fontSize:11}}>{ts.count} {ts.type}{ts.count!==1?"s":""}</div>
            {ts.hits!=null&&<div style={{color:ts.hits>0?GREEN:T3,fontSize:11,fontWeight:700,marginTop:4}}>{ts.hits} hit 20k</div>}
          </div>
        ))}
      </div>

      {/* Per-content table */}
      {contents.length>0&&(
        <Block icon="📋" label="Content Performance Table" color={T3}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["","Content","Type","KPI","Saves","Follows"].map(h=>(
                    <th key={h} style={{color:T3,fontSize:11,fontWeight:700,textTransform:"uppercase",padding:"0 8px 10px",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contents.map(c=>{
                  const cfg=CONTENT_TYPES[c.contentType]||CONTENT_TYPES.Reel;
                  const logs=c.logs||[];
                  const getM=m=>{for(let i=logs.length-1;i>=0;i--){const v=logs[i].metrics?.[m];if(v) return parseInt(v);}return null;};
                  const views=getM("views"),saves=getM("saves"),follows=getM("new_follows");
                  const kpiVal=cfg.primaryKPI==="views"?views:saves;
                  const kpiCol=cfg.primaryKPI==="views"?(views>=20000?GREEN:views>=5000?YELLOW:views?RED:T3):(saves>0?GREEN:T3);
                  return (
                    <tr key={c.id} style={{borderTop:`1px solid ${EDGE}`}}>
                      <td style={{padding:"10px 8px",fontSize:16}}>{cfg.icon}</td>
                      <td style={{padding:"10px 8px",color:T2,fontSize:13,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{c.title}"</td>
                      <td style={{padding:"10px 8px"}}><TypeBadge type={c.contentType}/></td>
                      <td style={{padding:"10px 8px",color:kpiCol,fontWeight:700,fontSize:14}}>{kpiVal!=null?kpiVal.toLocaleString():"—"}</td>
                      <td style={{padding:"10px 8px",color:T2,fontSize:13}}>{saves!=null?saves:"—"}</td>
                      <td style={{padding:"10px 8px",color:follows?GREEN:T3,fontSize:13,fontWeight:follows?700:400}}>{follows?"+"+follows:"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {!miData&&!loading&&(
        <button onClick={generateMI} disabled={contents.length===0} style={{
          width:"100%",
          background:contents.length?`linear-gradient(135deg,${BLUE},${PURPLE},${PINK})`:LIFT,
          border:`1px solid ${contents.length?PURPLE:EDGE}`,
          borderRadius:12,padding:18,color:contents.length?T1:T3,
          fontWeight:800,fontSize:16,cursor:contents.length?"pointer":"not-allowed",letterSpacing:0.3
        }}>
          {contents.length===0?"Log content first to generate report":"🧠 Generate Full MI Report"}
        </button>
      )}

      {loading&&<Spinner msg={msg}/>}

      {miData&&!loading&&(<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div style={{background:`${gradeCol[miData.overall_grade]||RED}14`,border:`1px solid ${gradeCol[miData.overall_grade]||RED}40`,borderRadius:14,padding:22,textAlign:"center"}}>
            <div style={{color:gradeCol[miData.overall_grade]||RED,fontWeight:900,fontSize:50,lineHeight:1}}>{miData.overall_grade}</div>
            <div style={{color:T3,fontSize:12,margin:"8px 0 5px",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Overall Grade</div>
            <div style={{color:T2,fontSize:13,lineHeight:1.5}}>{miData.grade_note}</div>
          </div>
          <div style={{background:`${velCol[miData.growth_velocity]||T3}14`,border:`1px solid ${velCol[miData.growth_velocity]||T3}40`,borderRadius:14,padding:22,textAlign:"center"}}>
            <div style={{color:velCol[miData.growth_velocity]||T3,fontWeight:800,fontSize:20,marginBottom:6}}>{miData.growth_velocity}</div>
            <div style={{color:T3,fontSize:12,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Growth Velocity</div>
            <div style={{color:T2,fontSize:13,lineHeight:1.5}}>{miData.velocity_note}</div>
          </div>
        </div>

        {miData.content_type_breakdown?.length>0&&(
          <Block icon="📊" label="Performance by Content Type" color={T3}>
            {miData.content_type_breakdown.map((ct,i)=>{
              const tcfg=CONTENT_TYPES[ct.type]||CONTENT_TYPES.Reel;
              return (
                <div key={i} style={{padding:"14px 0",borderBottom:i<miData.content_type_breakdown.length-1?`1px solid ${EDGE}`:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:18}}>{tcfg.icon}</span>
                    <span style={{color:tcfg.color,fontWeight:700,fontSize:15}}>{ct.type}</span>
                    <span style={{color:verdictCol[ct.verdict]||T3,fontWeight:700,fontSize:14}}>{ct.verdict}</span>
                    <span style={{color:T3,fontSize:13}}>{ct.count} pieces · avg {ct.kpi_label}: {ct.avg_kpi}</span>
                  </div>
                  <p style={{color:T2,fontSize:13,margin:"0 0 4px"}}>{ct.strength}</p>
                  <p style={{color:tcfg.color,fontSize:13,margin:0,fontWeight:600}}>→ {ct.advice}</p>
                </div>
              );
            })}
          </Block>
        )}

        {miData.content_mix_recommendation&&(
          <div style={{background:`${PURPLE}14`,border:`1px solid ${PURPLE}35`,borderRadius:14,padding:18,marginBottom:14}}>
            <p style={{color:"#C4A7FF",fontWeight:700,fontSize:11,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:1.2}}>🎯 Recommended Content Mix</p>
            <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.7}}>{miData.content_mix_recommendation}</p>
          </div>
        )}

        {miData.tip_effectiveness?.length>0&&(
          <Block icon="🎯" label="Tip Effectiveness — Did My Suggestions Work?" color="#C4A7FF">
            {miData.tip_effectiveness.map((t,i)=>(
              <div key={i} style={{borderBottom:i<miData.tip_effectiveness.length-1?`1px solid ${EDGE}`:"none",padding:"12px 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <span style={{color:T1,fontWeight:600,fontSize:14}}>{t.category}</span>
                  <span style={{
                    background:t.verdict==="Do More"?`${GREEN}20`:t.verdict==="Stop"?`${RED}20`:`${YELLOW}20`,
                    color:t.verdict==="Do More"?GREEN:t.verdict==="Stop"?RED:YELLOW,
                    borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"
                  }}>{t.verdict}</span>
                </div>
                <p style={{color:T2,fontSize:13,margin:"0 0 4px"}}>Impact: {t.estimated_impact}</p>
                <p style={{color:T3,fontSize:12,margin:0}}>Evidence: {t.evidence}</p>
              </div>
            ))}
          </Block>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <Block icon="✅" label="What Worked" color={GREEN} style={{marginBottom:0}}>
            {miData.what_worked?.map((w,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <p style={{color:T1,fontSize:13,fontWeight:600,margin:"0 0 4px"}}>{w.action}</p>
                <p style={{color:T3,fontSize:12,margin:0}}>{w.metric_proof}</p>
              </div>
            ))}
          </Block>
          <Block icon="❌" label="What Didn't" color={RED} style={{marginBottom:0}}>
            {miData.what_didnt_work?.map((w,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <p style={{color:T1,fontSize:13,fontWeight:600,margin:"0 0 3px"}}>{w.action}</p>
                <p style={{color:T3,fontSize:12,margin:"0 0 3px"}}>{w.why}</p>
                <p style={{color:RED,fontSize:12,margin:0}}>→ {w.pivot}</p>
              </div>
            ))}
          </Block>
        </div>

        <Block icon="➕" label="Follower Growth + Reach Trend" color={GREEN}>
          <Label color={GREEN}>Follower growth analysis</Label>
          <p style={{color:T2,fontSize:14,margin:"0 0 16px",lineHeight:1.7}}>{miData.follower_growth_analysis}</p>
          <Label color={BLUE}>Reach trend</Label>
          <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.7}}>{miData.reach_trend}</p>
        </Block>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <Block icon="🏆" label="Top 3 Wins" color={GREEN} style={{marginBottom:0}}>
            {miData.top_3_wins?.map((w,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 7px"}}>{i+1}. {w}</p>)}
          </Block>
          <Block icon="⚠️" label="Top 3 Gaps" color={YELLOW} style={{marginBottom:0}}>
            {miData.top_3_gaps?.map((g,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 7px"}}>{i+1}. {g}</p>)}
          </Block>
        </div>

        <div style={{background:`${BLUE}14`,border:`1px solid ${BLUE}35`,borderRadius:14,padding:20,marginBottom:14}}>
          <p style={{color:BLUE,fontWeight:700,fontSize:12,margin:"0 0 14px",textTransform:"uppercase",letterSpacing:1.2}}>📅 Next 30 Days — Priority Actions</p>
          {miData.next_30_days?.map((a,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<(miData.next_30_days.length-1)?`1px solid ${BLUE}20`:"none",alignItems:"flex-start"}}>
              <span style={{color:BLUE,fontWeight:800,fontSize:14,minWidth:22}}>{i+1}.</span>
              <span style={{color:T2,fontSize:14,lineHeight:1.5}}>{a}</span>
            </div>
          ))}
        </div>

        <div style={{background:`${GREEN}10`,border:`1px solid ${GREEN}30`,borderRadius:12,padding:18}}>
          <p style={{color:GREEN,fontWeight:700,fontSize:12,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:1.2}}>📈 Projected Growth</p>
          <p style={{color:T2,fontSize:14,margin:0,lineHeight:1.7}}>{miData.projected_growth}</p>
        </div>

        <button onClick={()=>setMiData(null)} style={{width:"100%",background:LIFT,border:`1px solid ${EDGE}`,borderRadius:12,padding:13,color:T2,cursor:"pointer",marginTop:14,fontSize:14,fontWeight:600}}>
          ↺ Regenerate MI Report
        </button>
      </>)}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ profile, contents, onNav }) {
  const now=Date.now();
  let dueCount=0;
  contents.forEach(c=>{
    const hrs=(now-new Date(c.postedAt).getTime())/3600000;
    const cfg=CONTENT_TYPES[c.contentType]||CONTENT_TYPES.Reel;
    cfg.schedules.forEach(s=>{if(hrs>=s.minH&&hrs<=s.maxH&&!(c.logs||[]).some(l=>l.checkInId===s.id))dueCount++;});
  });

  const allLogs=contents.flatMap(c=>c.logs||[]);
  const reels=contents.filter(c=>c.contentType==="Reel");
  const reelViews=reels.map(c=>{const v=(c.logs||[]).map(l=>parseInt(l.metrics?.views||0)).filter(Boolean);return v.length?Math.max(...v):0;}).filter(Boolean);
  const avgReelViews=reelViews.length?Math.round(reelViews.reduce((a,b)=>a+b,0)/reelViews.length):0;
  const totalFollows=allLogs.reduce((s,l)=>s+parseInt(l.metrics?.new_follows||0),0);

  const typeCount=t=>contents.filter(c=>c.contentType===t).length;

  return (
    <div style={{padding:"20px 0"}}>
      {/* Greeting */}
      <div style={{marginBottom:24}}>
        <h2 style={{color:T1,margin:"0 0 4px",fontSize:22,fontWeight:800}}>Hi, {profile.handle} 👋</h2>
        <p style={{color:T2,fontSize:14,margin:0}}>{profile.niche} · <span style={{color:T3}}>{profile.goal}</span></p>
      </div>

      {/* Primary stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[
          {label:"Reel Avg Views",val:avgReelViews?avgReelViews.toLocaleString():"—",col:avgReelViews>=20000?GREEN:avgReelViews>0?YELLOW:T3,sub:avgReelViews>=20000?"On target 🔥":avgReelViews>0?"target: 20k":"no data yet"},
          {label:"Check-ins Due",val:dueCount||"✓",col:dueCount?YELLOW:T3,sub:dueCount?"action needed":"all done"},
          {label:"Follows Gained",val:totalFollows||"—",col:totalFollows?GREEN:T3,sub:"from content"},
        ].map((s,i)=>(
          <div key={i} style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:16,textAlign:"center"}}>
            <div style={{color:s.col,fontWeight:800,fontSize:22,lineHeight:1}}>{s.val}</div>
            <div style={{color:T3,fontSize:11,margin:"5px 0 3px",textTransform:"uppercase",letterSpacing:0.5,fontWeight:600}}>{s.label}</div>
            <div style={{color:s.col,fontSize:11}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Content type counts */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
        {ALL_TYPES.map(t=>{
          const c=CONTENT_TYPES[t]; const cnt=typeCount(t);
          return (
            <div key={t} style={{background:SURFACE,border:`1px solid ${c.color}30`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:5}}>{c.icon}</div>
              <div style={{color:cnt?c.color:T3,fontWeight:800,fontSize:18}}>{cnt}</div>
              <div style={{color:T3,fontSize:12,marginTop:2}}>{t}s tracked</div>
            </div>
          );
        })}
      </div>

      {/* Due check-ins alert */}
      {dueCount>0&&(
        <div onClick={()=>onNav("checkins")} style={{
          background:`${PINK}10`,border:`1px solid ${PINK}50`,
          borderRadius:14,padding:18,marginBottom:12,cursor:"pointer",display:"flex",gap:14,alignItems:"center"
        }}>
          <span style={{fontSize:28}}>⚡</span>
          <div style={{flex:1}}>
            <div style={{color:PINK,fontWeight:700,fontSize:15,marginBottom:3}}>{dueCount} check-in{dueCount>1?"s":""} due now</div>
            <div style={{color:T2,fontSize:13}}>Log metrics → get action plan</div>
          </div>
          <span style={{color:PINK,fontSize:22,fontWeight:300}}>›</span>
        </div>
      )}

      {/* Nav cards */}
      {[
        {key:"studio",icon:"🎬",title:"Create Content",sub:"Reels · Posts · Carousels — type-specific brief, fresh research"},
        {key:"tracker",icon:"📊",title:"Content Tracker",sub:"Log & track all your published content"},
        {key:"mi",icon:"🧠",title:"MI Dashboard",sub:"Tip ROI · Growth analysis · What's actually working"},
      ].map(item=>(
        <div key={item.key} onClick={()=>onNav(item.key)} style={{
          background:SURFACE,border:`1px solid ${EDGE}`,
          borderRadius:14,padding:18,marginBottom:10,cursor:"pointer",
          display:"flex",gap:14,alignItems:"center",transition:"border-color .15s"
        }}>
          <span style={{fontSize:24}}>{item.icon}</span>
          <div style={{flex:1}}>
            <div style={{color:T1,fontWeight:700,fontSize:15,marginBottom:3}}>{item.title}</div>
            <div style={{color:T2,fontSize:13}}>{item.sub}</div>
          </div>
          <span style={{color:T3,fontSize:20,fontWeight:300}}>›</span>
        </div>
      ))}

      {/* What I need */}
      <div style={{background:`${YELLOW}08`,border:`1px solid ${YELLOW}20`,borderRadius:14,padding:18,marginTop:18}}>
        <p style={{color:YELLOW,fontWeight:700,fontSize:12,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>⚡ What I need from you</p>
        {[
          "Log every Reel/Post/Carousel right after publishing",
          "Enter Instagram Insights numbers at each check-in (60 sec)",
          "Reply to every comment within 30 min of posting",
          "Share reference content in Studio before generating briefs",
        ].map((n,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 6px"}}>• {n}</p>)}
      </div>

      {/* Responsibility split */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
        <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:16}}>
          <p style={{color:PURPLE,fontWeight:700,fontSize:11,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>🤖 I handle</p>
          {["Content brief + research","Hook + caption writing","Hashtag strategy","Check-in action plans","Tip effectiveness tracking","MI + growth analysis"].map((t,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 5px"}}>✓ {t}</p>)}
        </div>
        <div style={{background:SURFACE,border:`1px solid ${EDGE}`,borderRadius:14,padding:16}}>
          <p style={{color:PINK,fontWeight:700,fontSize:11,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>🙋 You handle</p>
          {["Film & post content","Reply to comments","Log metrics in check-ins","Share reference posts","Final content approval"].map((t,i)=><p key={i} style={{color:T2,fontSize:13,margin:"0 0 5px"}}>• {t}</p>)}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [profile,setProfile]=useState(null);
  const [contents,setContents]=useState([]);
  const [tab,setTab]=useState("dashboard");

  useEffect(()=>{const d=load();if(d?.profile)setProfile(d.profile);if(d?.contents)setContents(d.contents);},[]);
  useEffect(()=>{if(profile)persist({profile,contents});},[profile,contents]);

  if(!profile) return <Onboarding onComplete={p=>setProfile(p)}/>;

  const now=Date.now();
  let dueCount=0;
  contents.forEach(c=>{
    const hrs=(now-new Date(c.postedAt).getTime())/3600000;
    const cfg=CONTENT_TYPES[c.contentType]||CONTENT_TYPES.Reel;
    cfg.schedules.forEach(s=>{if(hrs>=s.minH&&hrs<=s.maxH&&!(c.logs||[]).some(l=>l.checkInId===s.id))dueCount++;});
  });

  const navItems=[
    {key:"dashboard",icon:"🏠",label:"Home"},
    {key:"checkins",icon:"⚡",label:"Check-ins",badge:dueCount},
    {key:"studio",icon:"🎬",label:"Studio"},
    {key:"tracker",icon:"📊",label:"Tracker"},
    {key:"mi",icon:"🧠",label:"MI"},
  ];

  const tabs={
    dashboard:<Dashboard profile={profile} contents={contents} onNav={setTab}/>,
    checkins:<CheckinsTab contents={contents} setContents={setContents} profile={profile}/>,
    studio:<ContentStudio profile={profile}/>,
    tracker:<TrackerTab contents={contents} setContents={setContents}/>,
    mi:<MIDashboard contents={contents} profile={profile}/>,
  };

  return (
    <div style={{background:BG,minHeight:"100vh",fontFamily:"'Inter',-apple-system,sans-serif",color:T1}}>
      {/* Top bar */}
      <div style={{background:BG,borderBottom:`1px solid ${EDGE}`,padding:"13px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:4}}>
            {[PINK,PURPLE,BLUE].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>)}
          </div>
          <span style={{color:T1,fontWeight:800,fontSize:15,letterSpacing:-0.5}}>Social Media Manager</span>
          <span style={{color:T3,fontSize:12}}>· Instagram</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:T2,fontSize:13}}>{profile.handle}</span>
          <div style={{width:7,height:7,borderRadius:"50%",background:GREEN}}/>
        </div>
      </div>

      {/* Page content */}
      <div style={{maxWidth:680,margin:"0 auto",padding:"0 18px 90px"}}>
        {tabs[tab]||tabs.dashboard}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:BG,borderTop:`1px solid ${EDGE}`,display:"flex",padding:"10px 0 18px"}}>
        {navItems.map(({key,icon,label,badge})=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            flex:1,background:"transparent",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 0",position:"relative"
          }}>
            <span style={{fontSize:21}}>{icon}</span>
            {badge>0&&(
              <div style={{position:"absolute",top:0,right:"calc(50% - 19px)",background:PINK,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{badge}</div>
            )}
            <span style={{fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:tab===key?PINK:T3}}>{label}</span>
            {tab===key&&<div style={{width:16,height:2,background:PINK,borderRadius:2}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
