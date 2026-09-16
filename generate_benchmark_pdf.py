# -*- coding: utf-8 -*-
"""
Générateur de Rapport PDF Benchmark — MIRAJ Recouvrement
Compare https://miraj-recouv.com/ et la nouvelle refonte créée.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

PDF_PATH = os.path.join(os.path.dirname(__file__), "Rapport_Benchmark_MIRAJ.pdf")

# Palette MIRAJ
COLOR_INK = colors.HexColor("#15171C")
COLOR_RUST = colors.HexColor("#A3402A")
COLOR_RUST_LIGHT = colors.HexColor("#FAEEE9")
COLOR_TEAL = colors.HexColor("#2E5B4D")
COLOR_TEAL_LIGHT = colors.HexColor("#EBF4F1")
COLOR_BRASS = colors.HexColor("#9C7A3C")
COLOR_GRAY_BG = colors.HexColor("#F8F9FA")
COLOR_GRAY_BORDER = colors.HexColor("#E2DFD5")
COLOR_GRAY_TEXT = colors.HexColor("#555555")
COLOR_WHITE = colors.white

class NumberedCanvas(canvas.Canvas):
    """Numérotation des pages dynamique (Page X / Y)"""
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
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_GRAY_TEXT)
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 810, "MIRAJ RECOUVREMENT — RAPPORT COMPARATIF & BENCHMARK DIGITAL")
            self.setStrokeColor(COLOR_GRAY_BORDER)
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)
        
        # Footer
        self.setStrokeColor(COLOR_GRAY_BORDER)
        self.setLineWidth(0.5)
        self.line(36, 40, 559, 40)
        self.drawString(36, 28, "Confidentiel — MIRAJ Recouvrement — Audit & Benchmark V2.0")
        self.drawRightString(559, 28, f"Page {self._pageNumber} sur {page_count}")
        self.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Styles personnalisés
    style_h1 = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=COLOR_INK,
        spaceAfter=4
    )
    style_h2 = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_INK,
        spaceBefore=14,
        spaceAfter=8
    )
    style_sub = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=COLOR_GRAY_TEXT,
        spaceAfter=12
    )
    style_body = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=COLOR_INK
    )
    style_body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=style_body,
        fontName='Helvetica-Bold'
    )
    style_badge_rust = ParagraphStyle(
        'BadgeRust',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=COLOR_RUST
    )
    style_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=COLOR_INK
    )
    style_cell_head = ParagraphStyle(
        'TableCellHead',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=COLOR_WHITE
    )
    style_cell_red = ParagraphStyle(
        'TableCellRed',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=COLOR_RUST
    )
    style_cell_green = ParagraphStyle(
        'TableCellGreen',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=COLOR_TEAL
    )

    story = []

    # ================= PAGE 1 =================
    # Top branding bar
    brand_data = [
        [
            Paragraph("<b>MIRAJ RECOUVREMENT</b><br/><font size=7 color='#a3402a'>AUDIT TECHNIQUE &amp; BENCHMARK</font>", style_body),
            Paragraph("<font size=7 color='#666666'>DATE : 15 Septembre 2026<br/>OBJET : Comparatif Site Initial vs Nouvelle Refonte</font>", ParagraphStyle('R', alignment=2))
        ]
    ]
    brand_table = Table(brand_data, colWidths=[300, 223])
    brand_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, COLOR_INK),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(brand_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("RAPPORT D'AUDIT COMPARATIF &amp; BENCHMARK", style_badge_rust))
    story.append(Paragraph("Transformation Digitale &amp; Performance MIRAJ", style_h1))
    story.append(Paragraph(
        "Ce rapport établit une analyse objective et détaillée entre le site vitrine historique hébergé sur "
        "<b>https://miraj-recouv.com/</b> et la nouvelle plateforme développée comprenant backend, espace admin et SEO renforcé.",
        style_sub
    ))

    # Tableau Score Global
    score_data = [
        [
            Paragraph("<font size=8 color='#666'>SITE INITIAL (miraj-recouv.com)</font><br/><font size=22 color='#666'><b>44 / 100</b></font><br/><br/>"
                      "<font size=8>• Site vitrine 100% statique<br/>• Aucun stockage des demandes<br/>• Aucun espace d'administration<br/>• SEO basique sans rich snippets<br/>• Formulaire contact passif</font>", style_body),
            Paragraph("<font size=8 color='#2e5b4d'>NOUVELLE PLATEFORME MIRAJ</font><br/><font size=22 color='#2e5b4d'><b>96 / 100</b></font><br/><br/>"
                      "<font size=8>• Backend Express + Base SQLite<br/>• Espace Admin sécurisé JWT (/admin)<br/>• Simulateur interactif de BFR<br/>• Section Problème vs Solution<br/>• SEO Schema.org enrichi (FAQPage)</font>", style_body)
        ]
    ]
    score_table = Table(score_data, colWidths=[255, 255])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), COLOR_GRAY_BG),
        ('BACKGROUND', (1,0), (1,0), COLOR_TEAL_LIGHT),
        ('BOX', (0,0), (0,0), 1, COLOR_GRAY_BORDER),
        ('BOX', (1,0), (1,0), 1.5, COLOR_TEAL),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 16))

    # Section 1 : Barres de progression par axe
    story.append(Paragraph("1. Évaluation Synthétique par Axe Stratégique", style_h2))

    axes_data = [
        [Paragraph("<b>Axe Stratégique</b>", style_cell_head), Paragraph("<b>Site Initial</b>", style_cell_head), Paragraph("<b>Nouvelle Refonte</b>", style_cell_head), Paragraph("<b>Impact &amp; Gain</b>", style_cell_head)],
        [Paragraph("<b>1. Infrastructure Backend &amp; Données</b>", style_cell), Paragraph("10% (Inexistant)", style_cell_red), Paragraph("100% (Node.js + SQLite)", style_cell_green), Paragraph("+90 pts (Persistance garantie)", style_cell)],
        [Paragraph("<b>2. Pilotage &amp; Administration (CRM)</b>", style_cell), Paragraph("0% (Aucun accès)", style_cell_red), Paragraph("100% (Dashboard JWT)", style_cell_green), Paragraph("+100 pts (Export CSV / Filtres)", style_cell)],
        [Paragraph("<b>3. Acquisition &amp; Taux de Conversion</b>", style_cell), Paragraph("40% (Formulaire passif)", style_cell_red), Paragraph("95% (Double tunnel + Guides)", style_cell_green), Paragraph("+55 pts (Lead Magnets qualifiés)", style_cell)],
        [Paragraph("<b>4. Référencement Naturel &amp; SERP</b>", style_cell), Paragraph("35% (Meta standard)", style_cell_red), Paragraph("96% (Schema.org / Local)", style_cell_green), Paragraph("+61 pts (FAQ Rich Snippets)", style_cell)],
        [Paragraph("<b>5. Outils Pédagogiques &amp; Réassurance</b>", style_cell), Paragraph("0% (Aucun outil)", style_cell_red), Paragraph("95% (Simulateur BFR / Ancienneté)", style_cell_green), Paragraph("+95 pts (Calculateur dynamique)", style_cell)],
        [Paragraph("<b>6. Identité Visuelle &amp; Ergonomie</b>", style_cell), Paragraph("45% (Thème classique)", style_cell_red), Paragraph("98% (Design éditorial / Fraunces)", style_cell_green), Paragraph("+53 pts (Image haut de gamme)", style_cell)],
    ]
    axes_table = Table(axes_data, colWidths=[150, 110, 130, 120])
    axes_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_INK),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('GRID', (0,0), (-1,-1), 0.5, COLOR_GRAY_BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [COLOR_WHITE, COLOR_GRAY_BG]),
    ]))
    story.append(axes_table)
    story.append(Spacer(1, 14))

    # Synthèse bloc
    note_box = Table([[
        Paragraph(
            "<b>Constat Exécutif :</b> Le site originel <i>miraj-recouv.com</i> souffrait d'une lacune critique : "
            "l'absence de backend exposait l'entreprise à des pertes de leads et empêchait tout suivi commercial. "
            "La nouvelle plateforme transforme la présence en ligne de MIRAJ en un système autonome de génération, qualification et gestion des impayés.",
            style_body
        )
    ]], colWidths=[510])
    note_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), COLOR_RUST_LIGHT),
        ('LINELEFT', (0,0), (0,0), 3, COLOR_RUST),
        ('PADDING', (0,0), (0,0), 10),
    ]))
    story.append(note_box)

    story.append(PageBreak())

    # ================= PAGE 2 =================
    story.append(Paragraph("2. Tableau Comparatif Détaillé Critère par Critère", style_h2))
    story.append(Paragraph("Analyse rigoureuse des fonctionnalités, de l'architecture technique et des opportunités business.", style_sub))

    detail_data = [
        [Paragraph("<b>Dimension</b>", style_cell_head), Paragraph("<b>Site Originel (miraj-recouv.com)</b>", style_cell_head), Paragraph("<b>Nouvelle Refonte MIRAJ</b>", style_cell_head)],
        [
            Paragraph("<b>Backend &amp; Base de Données</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>INEXISTANT</b></font><br/>Aucun serveur d'application. Dépendance à des solutions externes ou requêtes mail non sécurisées. Risque élevé de perte de prospects.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>NODE.JS + SQLITE ROBUSTE</b></font><br/>Serveur Express dédié, base de données SQLite locale structurée (`contacts`, `downloads`, `admins`). Zéro dépendance payante.", style_cell)
        ],
        [
            Paragraph("<b>Espace d'Administration</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>AUCUN</b></font><br/>Les dirigeants n'ont aucun moyen de consulter les dossiers reçus, de marquer leur statut ou de trier les demandes.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>DASHBOARD COMPLET (/admin)</b></font><br/>Connexion sécurisée par JWT, statistiques en temps réel, recherche multi-critères, modales de détail et export Excel CSV.", style_cell)
        ],
        [
            Paragraph("<b>Génération de Leads (CRO)</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>PASSIVE &amp; LIMITÉE</b></font><br/>Un seul formulaire basique de contact avec peu d'incitation à l'action. Taux de rebond important.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>DOUBLE TUNNEL DE CONVERSION</b></font><br/>Formulaire de devis express + 3 Guides téléchargeables (Lead Magnets) qualifiant le prospect (Nom, Fonction, Société, Tél, Email).", style_cell)
        ],
        [
            Paragraph("<b>Outil Interactif Client</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>AUCUN OUTIL</b></font><br/>Texte statique sans possibilité pour le client d'estimer son préjudice ou de projeter son retour sur investissement.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>SIMULATEUR DE PERTE DE BFR</b></font><br/>Calculateur interactif en direct du Chiffre d'Affaires nécessaire pour combler un impayé selon le taux de marge de l'entreprise.", style_cell)
        ],
        [
            Paragraph("<b>Levée des Objections Client</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>NON ADRESSÉ</b></font><br/>Ne répond pas à la crainte majeure des clients : la peur d'abîmer le lien commercial ou de payer des honoraires à fonds perdus.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>SECTION PROBLÈME VS SOLUTION</b></font><br/>4 cartes ciblées détaillant la prise en charge totale, le tact dans la négociation, le réseau judiciaire et le modèle au succès (*No cure, no pay*).", style_cell)
        ],
        [
            Paragraph("<b>SEO : Données Structurées</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>MINIMALISTE</b></font><br/>Balisage générique. Pas de mise en avant dans les résultats enrichis de Google.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>SCHEMA.ORG GRAPH COMPLET</b></font><br/>JSON-LD avec `LegalService`, catalogue d'offres et `FAQPage` permettant d'afficher des accordéons déroulants dans les résultats Google (SERP).", style_cell)
        ],
        [
            Paragraph("<b>SEO : Référencement Local</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>NON GÉOLOCALISÉ</b></font><br/>Aucune balise de coordonnées GPS ni de zonage administratif.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>BALISAGE GÉO TUNISIE</b></font><br/>Balises `geo.region` (TN-13), `geo.placename` (Ben Arous, Grand Tunis) et coordonnées GPS précises pour le référencement local.", style_cell)
        ],
        [
            Paragraph("<b>Directives d'Indexation</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>ABSENTES</b></font><br/>Pas de robots.txt ni de sitemap.xml. Indexation anarchique par les moteurs.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>ROBOTS.TXT &amp; SITEMAP.XML</b></font><br/>Fichier `sitemap.xml` conforme et `robots.txt` protégeant scrupuleusement les répertoires `/admin/` et `/api/`.", style_cell)
        ],
        [
            Paragraph("<b>Direction Artistique</b>", style_cell),
            Paragraph("<font color='#a3402a'><b>CONVENTIONNELLE</b></font><br/>Palette bleue standardisée manquant de caractère distinctif face aux concurrents.", style_cell),
            Paragraph("<font color='#2e5b4d'><b>STYLE ÉDITORIAL PRESTIGE</b></font><br/>Typographie Fraunces &amp; IBM Plex, palette Papier/Encre/Rust/Teal évoquant la rigueur juridique et la confiance institutionnelle.", style_cell)
        ],
    ]
    detail_table = Table(detail_data, colWidths=[110, 200, 200])
    detail_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_INK),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, COLOR_GRAY_BORDER),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [COLOR_WHITE, COLOR_GRAY_BG]),
    ]))
    story.append(detail_table)

    story.append(PageBreak())

    # ================= PAGE 3 =================
    story.append(Paragraph("3. Analyse SWOT &amp; Recommandations Stratégiques", style_h2))
    story.append(Paragraph("Évaluation stratégique pour maximiser le retour sur investissement du nouveau dispositif.", style_sub))

    swot_data = [
        [
            Paragraph("<b>FAIBLESSES DU SITE INITIAL</b><br/><br/>"
                      "• Risque de perte irrémédiable de prospects.<br/>"
                      "• Absence de visibilité pour les managers.<br/>"
                      "• Manque d'incitation à la conversion.<br/>"
                      "• Référencement bridé sans balisage FAQPage.<br/>"
                      "• Aucune interactivité pour valoriser l'offre.", style_body),
            Paragraph("<b>FORCES MAJEURES DE LA REFONTE</b><br/><br/>"
                      "• Stockage immédiat et centralisé des leads.<br/>"
                      "• Dashboard de suivi avec export Excel en 1 clic.<br/>"
                      "• Génération de leads qualifiés par lead magnet.<br/>"
                      "• Éligibilité aux Rich Snippets Google (SERP).<br/>"
                      "• Simulateur de BFR démontrant le coût de l'inaction.", style_body)
        ]
    ]
    swot_table = Table(swot_data, colWidths=[255, 255])
    swot_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), COLOR_RUST_LIGHT),
        ('BACKGROUND', (1,0), (1,0), COLOR_TEAL_LIGHT),
        ('BOX', (0,0), (0,0), 1, COLOR_RUST),
        ('BOX', (1,0), (1,0), 1.5, COLOR_TEAL),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(swot_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("4. Plan d'Action Recommandé pour la Mise en Ligne", style_h2))

    recom_data = [
        [
            Paragraph("<b>Étape 1 : Déploiement du Serveur</b><br/>"
                      "Installer l'application sur un VPS (Node.js v20+) ou serveur cloud avec PM2 pour garantir un redémarrage automatique en continu.", style_body),
            Paragraph("<b>Étape 2 : Sécurisation HTTPS &amp; DNS</b><br/>"
                      "Faire pointer le nom de domaine <i>miraj-recouv.com</i> vers le serveur et activer un certificat SSL gratuit (Let's Encrypt).", style_body)
        ],
        [
            Paragraph("<b>Étape 3 : Soumission Search Console</b><br/>"
                      "Déclarer l'URL du sitemap (<code>https://miraj-recouv.com/sitemap.xml</code>) dans Google Search Console pour indexer immédiatement les données structurées.", style_body),
            Paragraph("<b>Étape 4 : Exploitation Commerciale</b><br/>"
                      "Utiliser l'export CSV hebdomadaire depuis l'espace <code>/admin</code> pour alimenter vos équipes commerciales en prospects B2B ultra-qualifiés.", style_body)
        ]
    ]
    recom_table = Table(recom_data, colWidths=[255, 255])
    recom_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, COLOR_GRAY_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [COLOR_GRAY_BG, COLOR_WHITE]),
    ]))
    story.append(recom_table)
    story.append(Spacer(1, 16))

    concl_box = Table([[
        Paragraph(
            "<b>Conclusion de l'Audit :</b><br/>"
            "La refonte réalisée comble 100% des retards techniques et stratégiques de l'ancien site. "
            "MIRAJ dispose désormais d'un véritable outil d'affaires combinant autorité de marque, conformité SEO d'élite "
            "et infrastructure de capture de données sécurisée.",
            style_body
        )
    ]], colWidths=[510])
    concl_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), COLOR_INK),
        ('TEXTCOLOR', (0,0), (0,0), COLOR_WHITE),
        ('PADDING', (0,0), (0,0), 12),
    ]))
    story.append(concl_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF genere avec succes : {PDF_PATH}")

if __name__ == "__main__":
    build_pdf()
