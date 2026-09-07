import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#666666"))
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_text)
        self.drawString(54, 36, "HackCelestial 3.0 — Team BigSmokeweb | Celeste Platform")
        self.setStrokeColor(colors.HexColor("#D4CFC0"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()

def build_pdf(filename="HACKCELESTIAL_3.0_PPT_DOSSIER.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    primary = colors.HexColor("#2C2C2C")
    teal = colors.HexColor("#347F8C")
    gold = colors.HexColor("#C4A265")
    cream = colors.HexColor("#F9F7F2")
    border_color = colors.HexColor("#D4CFC0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=teal,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=gold,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SlideHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=teal,
        spaceBefore=12,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SlideSubHeader',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=primary,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=primary,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=primary,
        leftIndent=15,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1F3B4D"),
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("HackCelestial 3.0 — Presentation Dossier & Pitch Guide", title_style))
    story.append(Paragraph("Mahatma Education Society's Pillai University | Tech-Alegria<br/>Project: <b>Celeste — Local Experience Intelligence Platform</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=teal, spaceBefore=0, spaceAfter=14))

    # --- SLIDE 1 ---
    story.append(Paragraph("Slide 1: Identification, Focus Area & Pitch Summary", h1_style))
    
    id_table_data = [
        [Paragraph("<b>01. Identification</b>", body_style), Paragraph("<b>Team Name:</b> BigSmokeweb<br/><b>Project:</b> Celeste (Local Experience Intelligence)<br/><b>Repo:</b> https://github.com/BigSmokeweb/Hackathon<br/><b>Live:</b> https://experience-platform-sigma.vercel.app/", body_style)],
        [Paragraph("<b>02. Problem Statement</b>", body_style), Paragraph("<b>Hyper-Local Experience Discovery, Dynamic Route Optimization & Verified Artisan Marketplace for Cultural Tourism in India.</b>", body_style)],
    ]
    t1 = Table(id_table_data, colWidths=[130, 374])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), cream),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t1)
    story.append(Spacer(1, 8))

    # Abstract Box
    abstract_text = (
        "<b>03. Pitch Summary / Abstract (96 words):</b><br/>"
        "Most travel platforms rely on commercialized, SEO-bloated listicles that trap travelers in tourist crowds while overlooking verified cultural artisans and hidden gems. "
        "Celeste solves this through a dual-engine architecture: a deterministic PostGIS spatial filtering and mathematical scoring engine paired with an isolated, privacy-compliant AI phrasing proxy. "
        "Travelers receive real-time, weather-adaptive itineraries with budget and time continuity constraints, while verified local hosts manage authentic offerings backed by Argon2 authentication, Supabase Postgres, and strict KYC verification. "
        "The result is a resilient, sub-second discovery engine empowering local tourism with zero hallucinations and complete DPDP privacy compliance."
    )
    abstract_table = Table([[Paragraph(abstract_text, callout_style)]], colWidths=[504])
    abstract_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EBF3F5")),
        ('BOX', (0,0), (-1,-1), 1, teal),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(abstract_table)
    story.append(Spacer(1, 14))

    # --- SLIDE 2 ---
    story.append(Paragraph("Slide 2: Proposed Solution", h1_style))
    story.append(Paragraph("Celeste is an end-to-end local experience intelligence platform and marketplace connecting travelers with verified cultural artisans and hosts across Indian heritage cities (Mumbai, Jaipur, Ahmedabad, etc.).", body_style))
    
    sol_points = [
        "<b>1. Deterministic 10-Factor Scoring Engine:</b> Discards LLM hallucination in venue selection. Uses native PostGIS geography queries (<code>geography(Point, 4326)</code>) for instant sub-millisecond radius search, evaluating proximity, budget, authenticity, and transit continuity.",
        "<b>2. Stateless AI Phrasing Proxy:</b> Decoupled Google Gemini API acts purely as a linguistic layer to synthesize personalized <i>'Why this matches you'</i> explanations without database authority or latency bottlenecks.",
        "<b>3. Live Ephemeral Journey & Itinerary Planner:</b> Turn-by-turn routing with Leaflet/OpenStreetMap, travel duration estimation, and multi-stop budget tracking.",
        "<b>4. Host Guild Portal with Verified KYC:</b> Direct provider onboarding with structured availability rules and private, presigned S3/MinIO bucket storage for KYC document verification."
    ]
    for pt in sol_points:
        story.append(Paragraph(f"• {pt}", bullet_style))

    story.append(Paragraph("<b>How it Addresses the Problem:</b>", h2_style))
    story.append(Paragraph("• <b>Eliminates Tourist Traps:</b> Experiences ranked by peer authenticity scores, not sponsored ad spend.<br/>"
                           "• <b>Prevents Transit Fatigue:</b> Route continuity algorithms prevent chaotic zig-zagging across cities.<br/>"
                           "• <b>Guaranteed Privacy (DPDP Act):</b> All user coordinates are coarsened into anonymized geohashes before logging.", bullet_style))
    story.append(Spacer(1, 14))

    # --- SLIDE 3 ---
    story.append(PageBreak())
    story.append(Paragraph("Slide 3: Flow Chart & Architecture", h1_style))
    
    story.append(Paragraph("<b>Operational Flow (Start to Finish):</b>", h2_style))
    flow_steps = [
        "<b>Step 1 (Input):</b> Traveler selects City, Budget Band (₹ to ₹₹₹₹), Available Time, Category Vibe & Group Size.",
        "<b>Step 2 (Spatial Filter):</b> Backend executes PostGIS <code>ST_DWithin</code> radius query against Supabase PostgreSQL.",
        "<b>Step 3 (Deterministic Scoring):</b> 10 weighted factors rank candidates (Authenticity 20%, Proximity 15%, Budget 15%, etc.).",
        "<b>Step 4 (AI Phrasing):</b> Top-N candidates passed as structured JSON to Gemini Proxy for concise rationale generation.",
        "<b>Step 5 (Interactive Route):</b> Client renders interactive Leaflet map, turn-by-turn route, and dynamic itinerary cards.",
        "<b>Step 6 (Session Feedback):</b> Swiping or rejecting an item applies instant session penalty weight and recalculates the path."
    ]
    for s in flow_steps:
        story.append(Paragraph(f"• {s}", bullet_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Multi-Tier System Architecture Overview:</b>", h2_style))
    arch_data = [
        [Paragraph("<b>Tier</b>", body_style), Paragraph("<b>Components & Technologies</b>", body_style), Paragraph("<b>Responsibilities</b>", body_style)],
        [Paragraph("<b>Frontend Client</b>", body_style), Paragraph("Next.js 14 (App Router), React 18, Tailwind CSS, Leaflet Maps, Zustand", body_style), Paragraph("SSR/ISR rendering, travel journal drawer, interactive maps, zero-CLS layout", body_style)],
        [Paragraph("<b>API Gateway & Auth</b>", body_style), Paragraph("NestJS 10, Passport JWT, Argon2id, Redis Throttler (Token Bucket)", body_style), Paragraph("Rate limiting, Zod validation pipes, role-based access control, cryptographic hashing", body_style)],
        [Paragraph("<b>Core Services</b>", body_style), Paragraph("Recommendation Engine, Itinerary Planner, Provider Service, Gemini AI Proxy", body_style), Paragraph("Spatial querying, 10-factor deterministic scoring, stateless LLM reasoning, session management", body_style)],
        [Paragraph("<b>Data & Storage</b>", body_style), Paragraph("Supabase PostgreSQL 15, PostGIS, Redis, MinIO / S3 Private KYC Bucket", body_style), Paragraph("High-performance spatial indexing, session caching, secure short-lived KYC URLs", body_style)],
    ]
    t_arch = Table(arch_data, colWidths=[90, 210, 204])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), teal),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 14))

    # --- SLIDE 4 ---
    story.append(Paragraph("Slide 4: Innovation & Unique Functionality", h1_style))
    innovations = [
        "<b>Isolated 2-Layer Recommendation Engine:</b> Pure mathematical filtering guarantees deterministic candidate ranking without hallucinating venues, while Gemini generates human warmth and context without ever having database access.",
        "<b>DPDP-Compliant Privacy Architecture:</b> Never stores or logs raw GPS tracking history. Geolocation is converted to coarse geohash grids in all logs, honoring India's Digital Personal Data Protection Act.",
        "<b>Dynamic Weather Adaptability:</b> Real-time classification into <code>INDOOR</code>, <code>OUTDOOR</code>, and <code>WEATHER_DEPENDENT</code> dynamically boosts covered cultural spots during monsoon rains or heatwaves.",
        "<b>Session-Scoped Rejection Learning:</b> Rejections temporarily bias the current trip itinerary without permanently corrupting the user's permanent preferences.",
        "<b>Argon2id Enterprise Hashing:</b> State-of-the-art memory-hard password hashing protecting both travelers and local hosts."
    ]
    for inn in innovations:
        story.append(Paragraph(f"• {inn}", bullet_style))
    story.append(Spacer(1, 14))

    # --- SLIDE 5 ---
    story.append(PageBreak())
    story.append(Paragraph("Slide 5: Technical Details, Deployment & Cost", h1_style))
    
    story.append(Paragraph("<b>Stack Matrix:</b> Next.js 14 App Router (Frontend) | NestJS 10 (Backend) | Supabase Postgres + PostGIS (DB) | Redis (Cache) | Google Gemini 1.5 Flash (AI Proxy).", body_style))
    story.append(Paragraph("<b>Deployment Topology:</b> Frontend on Vercel Edge CDN with automatic asset compression. Backend containerized with Docker on Railway/Render. Database on Supabase Tokyo region (<code>aws-0-ap-northeast-1</code>) utilizing connection pooling.", body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Estimated Monthly Operational Costs (10,000 MAU):</b>", h2_style))
    cost_data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Service / Plan</b>", body_style), Paragraph("<b>Estimated Cost (USD/mo)</b>", body_style)],
        [Paragraph("Frontend Hosting", body_style), Paragraph("Vercel Hobby / Pro Tier (Edge CDN)", body_style), Paragraph("$0 – $20", body_style)],
        [Paragraph("Backend Compute", body_style), Paragraph("Railway / Render (1GB RAM, 1 vCPU)", body_style), Paragraph("$7 – $15", body_style)],
        [Paragraph("Database & PostGIS", body_style), Paragraph("Supabase Managed PostgreSQL (Free / Pro Tier)", body_style), Paragraph("$0 – $25", body_style)],
        [Paragraph("Cache & Rate Limit", body_style), Paragraph("Upstash Serverless Redis", body_style), Paragraph("$0 – $5", body_style)],
        [Paragraph("AI Reasoning Proxy", body_style), Paragraph("Google Gemini 1.5 Flash API (Pay-as-you-go)", body_style), Paragraph("$0 – $8", body_style)],
        [Paragraph("<b>Total Operational Cost</b>", body_style), Paragraph("<b>Ultra-lean Serverless Architecture</b>", body_style), Paragraph("<b>~$15 – $65 / month</b>", body_style)],
    ]
    t_cost = Table(cost_data, colWidths=[130, 240, 134])
    t_cost.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), cream),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,-1), (-1,-1), 1.5, teal),
    ]))
    story.append(t_cost)
    story.append(Spacer(1, 14))

    # --- SLIDE 6 ---
    story.append(Paragraph("Slide 6: Existing Solutions & Comparison", h1_style))
    comp_data = [
        [Paragraph("<b>Evaluation Dimension</b>", body_style), Paragraph("<b>Traditional Portals<br/>(TripAdvisor/MMT)</b>", body_style), Paragraph("<b>Pure AI Planners<br/>(RoamAround/Mindtrip)</b>", body_style), Paragraph("<b>Celeste Platform<br/>(Our Solution)</b>", body_style)],
        [Paragraph("<b>Discovery Engine</b>", body_style), Paragraph("Sponsored ads & popularity bias", body_style), Paragraph("Pure LLM generation (hallucinations)", body_style), Paragraph("<b>Deterministic PostGIS + AI Phrasing Proxy</b>", body_style)],
        [Paragraph("<b>Host & Artisan Vetting</b>", body_style), Paragraph("Unvetted crowdsourcing", body_style), Paragraph("None (scraped data)", body_style), Paragraph("<b>Host Guild KYC verification</b>", body_style)],
        [Paragraph("<b>Spatial Route Continuity</b>", body_style), Paragraph("Static list; no transit logic", body_style), Paragraph("Often unfeasible transit paths", body_style), Paragraph("<b>Turn-by-turn routing with distance penalty</b>", body_style)],
        [Paragraph("<b>Data Privacy</b>", body_style), Paragraph("Extensive tracking cookies", body_style), Paragraph("Variable third-party logging", body_style), Paragraph("<b>DPDP compliant (coarse geohashes)</b>", body_style)],
        [Paragraph("<b>System Resilience</b>", body_style), Paragraph("Requires full connectivity", body_style), Paragraph("Breaks on API outage", body_style), Paragraph("<b>Instant fallback to template scoring</b>", body_style)],
    ]
    t_comp = Table(comp_data, colWidths=[120, 120, 130, 134])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), teal),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 14))

    # --- SLIDE 7 ---
    story.append(Paragraph("Slide 7: Supplementary Information & Elevator Pitch", h1_style))
    links_data = [
        [Paragraph("<b>Live Production Website:</b>", body_style), Paragraph("<font color='#347F8C'><u>https://experience-platform-sigma.vercel.app/</u></font>", body_style)],
        [Paragraph("<b>GitHub Code Repository:</b>", body_style), Paragraph("<font color='#347F8C'><u>https://github.com/BigSmokeweb/Hackathon</u></font>", body_style)],
        [Paragraph("<b>Interactive Demo Video:</b>", body_style), Paragraph("YouTube / Google Drive Walkthrough Video Link", body_style)],
    ]
    t_links = Table(links_data, colWidths=[150, 354])
    t_links.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), cream),
        ('BOX', (0,0), (-1,-1), 0.5, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_links)
    story.append(Spacer(1, 8))

    pitch_box = (
        "<b>Live Pitch Script (30-Second Elevator Pitch):</b><br/>"
        "<i>'Good morning judges. Traditional travel apps push commercialized tourist traps, while modern AI trip planners hallucinate fake locations and ignore real-world geography. "
        "We built <b>Celeste</b> — an intelligent local experience platform designed for India's cultural tourism. "
        "Celeste replaces AI guesswork with a deterministic 10-factor scoring engine powered by Supabase PostGIS, paired with an isolated Gemini AI phrasing proxy for natural explanations. "
        "With Argon2-secured authentication, full DPDP privacy compliance, and a dedicated Artisan Guild portal, Celeste delivers personalized, verified, and route-optimized journeys in under 200 milliseconds. Thank you!'</i>"
    )
    t_pitch = Table([[Paragraph(pitch_box, body_style)]], colWidths=[504])
    t_pitch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFFDF8")),
        ('BOX', (0,0), (-1,-1), 1, gold),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_pitch)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    build_pdf("e:/Pillai/HACKCELESTIAL_3.0_PPT_DOSSIER.pdf")
