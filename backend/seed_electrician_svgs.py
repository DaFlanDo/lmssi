# -*- coding: utf-8 -*-
"""Профессиональные SVG-схемы для курсов электрика. Пишутся в uploads/ → /static/."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from app.config import get_settings

UP = get_settings().upload_dir
os.makedirs(UP, exist_ok=True)

# Общая палитра (под бренд приложения)
BLUE, DARK, SLATE, MUTE = "#2563eb", "#1e3a8a", "#334155", "#64748b"
BG, GREEN, AMBER, RED, YEL = "#f8fafc", "#10b981", "#f59e0b", "#ef4444", "#facc15"
F = 'font-family="Inter, Manrope, Arial, sans-serif"'

SVGS = {}

# 1. Знак «Осторожно! Электрическое напряжение»
SVGS["el_hazard_sign.svg"] = f'''<svg viewBox="0 0 820 420" xmlns="http://www.w3.org/2000/svg">
<rect width="820" height="420" fill="{BG}"/>
<polygon points="410,60 690,360 130,360" fill="{YEL}" stroke="#1e293b" stroke-width="14" stroke-linejoin="round"/>
<path d="M430 150 L350 270 L405 270 L380 350 L470 230 L412 230 Z" fill="#1e293b"/>
<text x="410" y="398" text-anchor="middle" {F} font-size="30" font-weight="800" fill="{SLATE}">ОСТОРОЖНО! ЭЛЕКТРИЧЕСКОЕ НАПРЯЖЕНИЕ</text>
</svg>'''

# 2. Действие тока: пороговые значения
def bar(x, w, color): return f'<rect x="{x}" y="150" width="{w}" height="70" rx="8" fill="{color}"/>'
SVGS["el_current_effects.svg"] = f'''<svg viewBox="0 0 860 420" xmlns="http://www.w3.org/2000/svg">
<rect width="860" height="420" fill="{BG}"/>
<text x="40" y="60" {F} font-size="30" font-weight="800" fill="{DARK}">Действие переменного тока (50 Гц) на человека</text>
{bar(60,180,GREEN)}{bar(240,260,AMBER)}{bar(500,300,RED)}
<text x="150" y="195" text-anchor="middle" {F} font-size="20" font-weight="700" fill="#fff">0,5–1,5 мА</text>
<text x="370" y="195" text-anchor="middle" {F} font-size="20" font-weight="700" fill="#fff">10–15 мА</text>
<text x="650" y="195" text-anchor="middle" {F} font-size="20" font-weight="700" fill="#fff">&gt; 100 мА</text>
<text x="150" y="260" text-anchor="middle" {F} font-size="16" font-weight="600" fill="{SLATE}">ощутимый</text>
<text x="370" y="260" text-anchor="middle" {F} font-size="16" font-weight="600" fill="{SLATE}">неотпускающий</text>
<text x="650" y="260" text-anchor="middle" {F} font-size="16" font-weight="600" fill="{SLATE}">фибрилляция сердца</text>
<text x="60" y="320" {F} font-size="17" fill="{MUTE}">Порог ощущения · Порог неотпускания (нельзя самому разжать руку) · Смертельно опасный ток</text>
<text x="60" y="352" {F} font-size="17" fill="{MUTE}">Опасным считается ток ≥ 0,3 А и напряжение прикосновения выше 50 В перем. / 120 В пост.</text>
</svg>'''

# 3. Шаговое напряжение
SVGS["el_step_voltage.svg"] = f'''<svg viewBox="0 0 860 440" xmlns="http://www.w3.org/2000/svg">
<rect width="860" height="440" fill="{BG}"/>
<text x="40" y="50" {F} font-size="28" font-weight="800" fill="{DARK}">Шаговое напряжение</text>
<line x1="0" y1="330" x2="860" y2="330" stroke="{SLATE}" stroke-width="3"/>
<g fill="none" stroke="{RED}" stroke-width="2.5" opacity="0.8">
<ellipse cx="180" cy="330" rx="60" ry="18"/><ellipse cx="180" cy="330" rx="130" ry="38"/>
<ellipse cx="180" cy="330" rx="210" ry="60"/><ellipse cx="180" cy="330" rx="300" ry="84"/></g>
<path d="M150 300 L210 300 L195 322 L165 322 Z" fill="#1e293b"/>
<text x="120" y="285" {F} font-size="16" font-weight="700" fill="{RED}">оборванный провод</text>
<g transform="translate(560,210)">
<circle cx="0" cy="0" r="22" fill="{BLUE}"/><rect x="-10" y="22" width="20" height="60" rx="6" fill="{BLUE}"/>
<line x1="-8" y1="100" x2="-8" y2="120" stroke="{BLUE}" stroke-width="10"/><line x1="8" y1="100" x2="8" y2="120" stroke="{BLUE}" stroke-width="10"/></g>
<line x1="552" y1="330" x2="568" y2="330" stroke="{RED}" stroke-width="5"/>
<text x="600" y="250" {F} font-size="17" fill="{SLATE}">Между ступнями возникает разность</text>
<text x="600" y="276" {F} font-size="17" fill="{SLATE}">потенциалов — шаговое напряжение.</text>
<text x="600" y="306" {F} font-size="17" font-weight="700" fill="{RED}">Выходить «гусиным шагом» или прыжками</text>
<text x="600" y="330" {F} font-size="17" font-weight="700" fill="{RED}">на одной ноге, не отрывая ступни далеко.</text>
</svg>'''

# 4. Технические мероприятия (5 шагов)
steps4 = ["Отключить установку и принять меры против ошибочного включения",
          "Вывесить запрещающие плакаты «Не включать! Работают люди»",
          "Проверить отсутствие напряжения указателем",
          "Наложить переносное заземление (включить заземляющие ножи)",
          "Оградить рабочее место и вывесить плакаты «Стой! Напряжение»"]
rows4 = "".join(
    f'<g transform="translate(50,{90+i*62})"><circle cx="22" cy="0" r="22" fill="{BLUE}"/>'
    f'<text x="22" y="7" text-anchor="middle" {F} font-size="22" font-weight="800" fill="#fff">{i+1}</text>'
    f'<text x="62" y="7" {F} font-size="19" font-weight="600" fill="{SLATE}">{s}</text></g>'
    for i, s in enumerate(steps4))
SVGS["el_protective_measures.svg"] = f'''<svg viewBox="0 0 860 430" xmlns="http://www.w3.org/2000/svg">
<rect width="860" height="430" fill="{BG}"/>
<text x="40" y="55" {F} font-size="27" font-weight="800" fill="{DARK}">Технические мероприятия (порядок снятия напряжения)</text>
{rows4}</svg>'''

# 5. Первая помощь (алгоритм)
fa = ["Обесточить: отключить ток или отделить пострадавшего от токоведущих частей сухим предметом",
      "Оценить сознание и дыхание (видеть, слышать, ощущать ≤ 10 с)",
      "Вызвать скорую помощь — 103 (или 112)",
      "Нет дыхания → сердечно-лёгочная реанимация: 30 нажатий : 2 вдоха",
      "Продолжать СЛР до приезда медиков или восстановления дыхания"]
rows5 = "".join(
    f'<g transform="translate(50,{96+i*60})"><rect x="0" y="-22" width="44" height="44" rx="12" fill="{RED if i in (3,) else BLUE}"/>'
    f'<text x="22" y="7" text-anchor="middle" {F} font-size="22" font-weight="800" fill="#fff">{i+1}</text>'
    f'<text x="62" y="6" {F} font-size="18" font-weight="600" fill="{SLATE}">{s}</text></g>'
    for i, s in enumerate(fa))
SVGS["el_first_aid.svg"] = f'''<svg viewBox="0 0 880 420" xmlns="http://www.w3.org/2000/svg">
<rect width="880" height="420" fill="{BG}"/>
<text x="40" y="55" {F} font-size="27" font-weight="800" fill="{DARK}">Первая помощь при поражении током</text>
{rows5}</svg>'''

# 6. Условные обозначения
def sym(x, y, draw, label):
    return f'<g transform="translate({x},{y})">{draw}<text x="40" y="92" text-anchor="middle" {F} font-size="15" font-weight="700" fill="{SLATE}">{label}</text></g>'
syms = [
    sym(40,70,f'<rect x="10" y="28" width="60" height="24" fill="none" stroke="{DARK}" stroke-width="3"/>', "Резистор"),
    sym(220,70,f'<circle cx="40" cy="40" r="22" fill="none" stroke="{DARK}" stroke-width="3"/><line x1="24" y1="24" x2="56" y2="56" stroke="{DARK}" stroke-width="3"/><line x1="56" y1="24" x2="24" y2="56" stroke="{DARK}" stroke-width="3"/>', "Лампа"),
    sym(400,70,f'<line x1="6" y1="44" x2="34" y2="44" stroke="{DARK}" stroke-width="3"/><line x1="34" y1="44" x2="64" y2="22" stroke="{DARK}" stroke-width="3"/><line x1="64" y1="44" x2="74" y2="44" stroke="{DARK}" stroke-width="3"/>', "Выключатель"),
    sym(580,70,f'<rect x="22" y="18" width="36" height="48" fill="none" stroke="{DARK}" stroke-width="3"/><text x="40" y="48" text-anchor="middle" {F} font-size="16" font-weight="800" fill="{DARK}">QF</text>', "Автомат. выкл."),
    sym(40,220,f'<rect x="14" y="20" width="52" height="44" fill="none" stroke="{DARK}" stroke-width="3"/><circle cx="40" cy="42" r="9" fill="none" stroke="{DARK}" stroke-width="3"/><text x="40" y="14" text-anchor="middle" {F} font-size="13" font-weight="800" fill="{DARK}">УЗО</text>', "УЗО"),
    sym(220,220,f'<line x1="40" y1="18" x2="40" y2="46" stroke="{DARK}" stroke-width="3"/><line x1="18" y1="46" x2="62" y2="46" stroke="{DARK}" stroke-width="3"/><line x1="26" y1="56" x2="54" y2="56" stroke="{DARK}" stroke-width="3"/><line x1="32" y1="64" x2="48" y2="64" stroke="{DARK}" stroke-width="3"/>', "Заземление (PE)"),
    sym(400,220,f'<circle cx="40" cy="42" r="22" fill="none" stroke="{DARK}" stroke-width="3"/><text x="40" y="49" text-anchor="middle" {F} font-size="18" font-weight="800" fill="{DARK}">M</text>', "Двигатель"),
    sym(580,220,f'<line x1="20" y1="30" x2="60" y2="30" stroke="{DARK}" stroke-width="3"/><line x1="20" y1="54" x2="60" y2="54" stroke="{DARK}" stroke-width="3"/><line x1="20" y1="30" x2="20" y2="54" stroke="{DARK}" stroke-width="3"/><line x1="60" y1="30" x2="60" y2="54" stroke="{DARK}" stroke-width="3"/><text x="40" y="20" text-anchor="middle" {F} font-size="12" font-weight="800" fill="{DARK}">~</text>', "Источник ~"),
]
SVGS["el_symbols.svg"] = f'''<svg viewBox="0 0 740 350" xmlns="http://www.w3.org/2000/svg">
<rect width="740" height="350" fill="{BG}"/>
<text x="40" y="44" {F} font-size="24" font-weight="800" fill="{DARK}">Условные графические обозначения на схемах</text>
{''.join(syms)}</svg>'''

# 7. Однолинейная схема щита
def node(y, label, color=DARK):
    return (f'<rect x="330" y="{y}" width="200" height="46" rx="10" fill="#fff" stroke="{color}" stroke-width="3"/>'
            f'<text x="430" y="{y+29}" text-anchor="middle" {F} font-size="17" font-weight="700" fill="{color}">{label}</text>')
SVGS["el_single_line.svg"] = f'''<svg viewBox="0 0 860 540" xmlns="http://www.w3.org/2000/svg">
<rect width="860" height="540" fill="{BG}"/>
<text x="40" y="44" {F} font-size="24" font-weight="800" fill="{DARK}">Однолинейная схема квартирного щита</text>
<line x1="430" y1="78" x2="430" y2="470" stroke="{SLATE}" stroke-width="3"/>
{node(70,"Ввод ~230/400 В")}{node(150,"Счётчик электроэнергии")}
{node(230,"Вводной автомат QF1 (40 А, C)",BLUE)}{node(310,"УЗО 63 А / 30 мА",GREEN)}
<g {F} font-size="14" font-weight="700">
<rect x="120" y="430" width="150" height="42" rx="9" fill="#fff" stroke="{DARK}" stroke-width="2"/><text x="195" y="456" text-anchor="middle" fill="{SLATE}">Свет · QF2 10А</text>
<rect x="355" y="430" width="150" height="42" rx="9" fill="#fff" stroke="{DARK}" stroke-width="2"/><text x="430" y="456" text-anchor="middle" fill="{SLATE}">Розетки · QF3 16А</text>
<rect x="590" y="430" width="170" height="42" rx="9" fill="#fff" stroke="{DARK}" stroke-width="2"/><text x="675" y="456" text-anchor="middle" fill="{SLATE}">Плита · QF4 25А</text>
</g>
<line x1="430" y1="408" x2="195" y2="408" stroke="{SLATE}" stroke-width="2"/><line x1="195" y1="408" x2="195" y2="430" stroke="{SLATE}" stroke-width="2"/>
<line x1="430" y1="408" x2="430" y2="430" stroke="{SLATE}" stroke-width="2"/>
<line x1="430" y1="408" x2="675" y2="408" stroke="{SLATE}" stroke-width="2"/><line x1="675" y1="408" x2="675" y2="430" stroke="{SLATE}" stroke-width="2"/>
</svg>'''

# 8. Цветовая маркировка проводников
def wire(x, color, edge, l1, l2):
    return (f'<rect x="{x}" y="120" width="120" height="180" rx="16" fill="{color}" stroke="{edge}" stroke-width="3"/>'
            f'<text x="{x+60}" y="350" text-anchor="middle" {F} font-size="26" font-weight="800" fill="{DARK}">{l1}</text>'
            f'<text x="{x+60}" y="382" text-anchor="middle" {F} font-size="15" font-weight="600" fill="{MUTE}">{l2}</text>')
SVGS["el_wire_colors.svg"] = f'''<svg viewBox="0 0 760 430" xmlns="http://www.w3.org/2000/svg">
<rect width="760" height="430" fill="{BG}"/>
<text x="40" y="60" {F} font-size="25" font-weight="800" fill="{DARK}">Цветовая маркировка проводников</text>
{wire(120,"#7c4a03","#5a3702","L","фаза — коричневый")}
{wire(320,"#38bdf8","#0284c7","N","нейтраль — голубой")}
<rect x="520" y="120" width="120" height="180" rx="16" fill="{YEL}" stroke="#a16207" stroke-width="3"/>
<rect x="520" y="120" width="40" height="180" fill="{GREEN}" opacity="0.85"/>
<text x="580" y="350" text-anchor="middle" {F} font-size="26" font-weight="800" fill="{DARK}">PE</text>
<text x="580" y="382" text-anchor="middle" {F} font-size="15" font-weight="600" fill="{MUTE}">земля — жёлто-зелёный</text>
</svg>'''

# 9. Принцип работы УЗО
SVGS["el_uzo_principle.svg"] = f'''<svg viewBox="0 0 860 440" xmlns="http://www.w3.org/2000/svg">
<rect width="860" height="440" fill="{BG}"/>
<text x="40" y="50" {F} font-size="25" font-weight="800" fill="{DARK}">Принцип работы УЗО (дифференциальный ток)</text>
<ellipse cx="300" cy="220" rx="70" ry="95" fill="none" stroke="{SLATE}" stroke-width="6"/>
<text x="300" y="345" text-anchor="middle" {F} font-size="15" font-weight="700" fill="{MUTE}">диф. трансформатор</text>
<line x1="120" y1="180" x2="760" y2="180" stroke="#7c4a03" stroke-width="8"/>
<line x1="120" y1="260" x2="760" y2="260" stroke="#38bdf8" stroke-width="8"/>
<text x="125" y="168" {F} font-size="15" font-weight="700" fill="#7c4a03">L  →  I_вход</text>
<text x="125" y="290" {F} font-size="15" font-weight="700" fill="#0284c7">N  ←  I_возврат</text>
<rect x="600" y="150" width="120" height="140" rx="12" fill="#fff" stroke="{GREEN}" stroke-width="3"/>
<text x="660" y="210" text-anchor="middle" {F} font-size="16" font-weight="800" fill="{GREEN}">нагрузка</text>
<text x="660" y="236" text-anchor="middle" {F} font-size="13" fill="{MUTE}">(прибор)</text>
<path d="M660 290 L660 360 L760 360" fill="none" stroke="{RED}" stroke-width="4" stroke-dasharray="8 6"/>
<text x="540" y="392" {F} font-size="16" font-weight="700" fill="{RED}">Ток утечки I_L ≠ I_N → дисбаланс ≥ 30 мА → отключение</text>
<text x="40" y="418" {F} font-size="15" fill="{MUTE}">В норме токи в фазе и нейтрали равны и компенсируют друг друга — УЗО не срабатывает.</text>
</svg>'''

# 10. Обложки курсов
SVGS["el_cover_safety.svg"] = f'''<svg viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{DARK}"/><stop offset="1" stop-color="{BLUE}"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#g1)"/>
<path d="M650 150 L500 380 L610 380 L560 540 L740 300 L630 300 Z" fill="{YEL}"/>
<text x="80" y="300" {F} font-size="64" font-weight="800" fill="#fff">Электробезопасность</text>
<text x="80" y="380" {F} font-size="44" font-weight="600" fill="#dbeafe">и охрана труда электромонтёра</text>
<text x="80" y="470" {F} font-size="26" font-weight="500" fill="#bfdbfe">Действие тока · СИЗ · Наряд-допуск · Первая помощь</text>
</svg>'''
SVGS["el_cover_montage.svg"] = f'''<svg viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#g2)"/>
<g stroke="#fff" stroke-width="6" fill="none" opacity="0.9">
<line x1="760" y1="180" x2="1080" y2="180"/><line x1="760" y1="300" x2="1080" y2="300"/><line x1="760" y1="420" x2="1080" y2="420"/>
<rect x="860" y="150" width="60" height="60"/><rect x="860" y="270" width="60" height="60"/><rect x="860" y="390" width="60" height="60"/></g>
<text x="80" y="300" {F} font-size="60" font-weight="800" fill="#fff">Электромонтажные</text>
<text x="80" y="375" {F} font-size="60" font-weight="800" fill="#fff">работы</text>
<text x="80" y="455" {F} font-size="30" font-weight="500" fill="#cffafe">Схемы · Проводка · Автоматы и УЗО · Сборка щита</text>
</svg>'''

if __name__ == "__main__":
    for name, svg in SVGS.items():
        with open(os.path.join(UP, name), "w", encoding="utf-8") as f:
            f.write(svg)
    print(f"✓ Записано {len(SVGS)} SVG в {UP}")
    for n in SVGS:
        print("  /static/" + n)
