"""
Демо-данные для ОАО «Барановичхлебпродукт».
Запуск: python seed_demo.py
Идемпотентен — повторный запуск ничего не сломает.
"""
import sys, os, uuid, json, random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, Base
import app.models  # noqa — регистрирует все модели

Base.metadata.create_all(bind=engine)

from app.models.user        import User
from app.models.group       import Group
from app.models.course      import Course, Module, Lesson, Block
from app.models.enrollment  import Enrollment
from app.models.progress    import LessonProgress
from app.models.certificate import Certificate
from app.services.auth      import hash_password

db = SessionLocal()

def uid() -> str:
    return str(uuid.uuid4())

def now(delta_days=0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=delta_days)

# ─── 1. ГРУППЫ (отделы + подотделы) ─────────────────────────────────────────

DEPARTMENTS = [
    {
        "name": "Производственный цех",
        "description": "Основное производство хлебобулочных и кондитерских изделий",
        "children": ["Хлебобулочный участок", "Кондитерский участок", "Упаковка"],
    },
    {
        "name": "Склад и логистика",
        "description": "Приёмка сырья, хранение и отгрузка готовой продукции",
        "children": ["Приёмка сырья", "Склад готовой продукции", "Транспортный отдел"],
    },
    {
        "name": "Отдел качества",
        "description": "Контроль качества, лабораторные исследования, сертификация",
        "children": ["Лаборатория", "Сертификация и стандарты"],
    },
    {
        "name": "ИТ и администрация",
        "description": "Информационные технологии, бухгалтерия, кадры",
        "children": ["Бухгалтерия", "Отдел кадров", "ИТ-отдел"],
    },
]

dept_by_name: dict[str, Group] = {}
for d in DEPARTMENTS:
    parent = db.query(Group).filter(Group.name == d["name"], Group.parent_id == None).first()
    if not parent:
        parent = Group(name=d["name"], description=d.get("description"))
        db.add(parent); db.commit(); db.refresh(parent)
    dept_by_name[d["name"]] = parent
    for child_name in d.get("children", []):
        child = db.query(Group).filter(Group.name == child_name, Group.parent_id == parent.id).first()
        if not child:
            child = Group(name=child_name, parent_id=parent.id)
            db.add(child); db.commit()

print("✓ Отделы")

# ─── 2. КУРСЫ ────────────────────────────────────────────────────────────────

COURSES_DATA = [
    {
        "title": "Охрана труда на производстве",
        "description": "Обязательный курс по охране труда для всех сотрудников производственных подразделений. Включает правила безопасной работы с оборудованием, средства защиты и действия при несчастных случаях.",
        "modules": [
            {
                "title": "Основы охраны труда",
                "lessons": [
                    {
                        "title": "Законодательная база",
                        "type": "text",
                        "duration": "20 мин",
                        "content": "<h2>Правовые основы охраны труда</h2><p>Охрана труда в Республике Беларусь регулируется Трудовым кодексом, законом «Об охране труда» и многочисленными техническими нормативными актами.</p><p>Каждый работодатель обязан обеспечить безопасные условия труда, проводить инструктажи и контролировать соблюдение правил.</p><blockquote>Инструктаж по охране труда — обязательная процедура при приёме на работу и при изменении условий труда.</blockquote><p>Ответственность за нарушение требований охраны труда несут как работодатель, так и работник.</p>",
                    },
                    {
                        "title": "Средства индивидуальной защиты",
                        "type": "text",
                        "duration": "15 мин",
                        "content": "<h2>СИЗ на производстве</h2><p>Средства индивидуальной защиты (СИЗ) — обязательный элемент безопасной работы на производстве.</p><ul><li><strong>Защита органов дыхания</strong> — респираторы, маски при работе с мукой и химическими веществами</li><li><strong>Защита рук</strong> — рабочие перчатки при контакте с горячими поверхностями</li><li><strong>Защита ног</strong> — специальная обувь с антискользящей подошвой</li><li><strong>Защитная одежда</strong> — санитарные халаты, фартуки, шапочки</li></ul><p>Использование СИЗ — не рекомендация, а обязанность каждого сотрудника.</p>",
                    },
                ],
            },
            {
                "title": "Безопасность на рабочем месте",
                "lessons": [
                    {
                        "title": "Работа с хлебопекарным оборудованием",
                        "type": "text",
                        "duration": "25 мин",
                        "content": "<h2>Правила безопасной работы с оборудованием</h2><p>Хлебопекарные печи, тестомесы и делители — источники повышенной опасности. Перед началом работы необходимо:</p><ol><li>Проверить исправность оборудования и защитных ограждений</li><li>Убедиться в наличии заземления</li><li>Не допускать посторонних лиц к оборудованию</li><li>Немедленно останавливать оборудование при появлении посторонних звуков или запахов</li></ol><p>Запрещено чистить и ремонтировать оборудование во время его работы.</p>",
                    },
                    {
                        "title": "Действия при несчастном случае",
                        "type": "text",
                        "duration": "20 мин",
                        "content": "<h2>Алгоритм действий при НС</h2><p>При несчастном случае на производстве необходимо действовать быстро и чётко:</p><ol><li><strong>Остановить работу оборудования</strong> (аварийная кнопка)</li><li><strong>Вызвать скорую помощь</strong> — тел. 103</li><li><strong>Оказать первую помощь</strong> пострадавшему до приезда медиков</li><li><strong>Сообщить мастеру или начальнику смены</strong></li><li><strong>Сохранить обстановку</strong> места происшествия до прибытия комиссии</li></ol>",
                    },
                ],
            },
        ],
    },
    {
        "title": "Санитарные нормы и гигиена",
        "description": "Курс для сотрудников пищевого производства. Личная гигиена, санитарная обработка оборудования и рабочих мест, требования к хранению сырья и готовой продукции.",
        "modules": [
            {
                "title": "Личная гигиена сотрудника",
                "lessons": [
                    {
                        "title": "Требования к внешнему виду",
                        "type": "text",
                        "duration": "15 мин",
                        "content": "<h2>Санитарные требования к персоналу</h2><p>Сотрудники пищевого производства обязаны соблюдать строгие санитарные нормы:</p><ul><li>Санитарная одежда (халат, шапочка, фартук) — обязательна на рабочем месте</li><li>Ногти коротко острижены, без лакового покрытия</li><li>Украшения и часы на производстве не допускаются</li><li>Волосы полностью убраны под шапочку</li></ul><p>Медицинская книжка — обязательный документ для работника пищевого производства.</p>",
                    },
                    {
                        "title": "Мытьё и дезинфекция рук",
                        "type": "text",
                        "duration": "10 мин",
                        "content": "<h2>Правильная гигиена рук</h2><p>Руки необходимо мыть:</p><ul><li>Перед началом работы и после каждого перерыва</li><li>После посещения туалета</li><li>После контакта с сырьём или отходами</li><li>После использования средств личной гигиены</li></ul><p>Алгоритм мытья рук: смочить водой → нанести мыло → тереть не менее 30 секунд → смыть → высушить одноразовым полотенцем.</p>",
                    },
                ],
            },
            {
                "title": "Санитария на производстве",
                "lessons": [
                    {
                        "title": "Обработка оборудования и инвентаря",
                        "type": "text",
                        "duration": "20 мин",
                        "content": "<h2>Схема санитарной обработки</h2><p>Плановая санитарная обработка проводится по расписанию. Включает:</p><ol><li>Механическую очистку от остатков продукта</li><li>Промывку горячей водой (65–70°C)</li><li>Обработку разрешёнными моющими средствами</li><li>Повторную промывку</li><li>Дезинфекцию</li><li>Заключительную промывку и просушку</li></ol>",
                    },
                ],
            },
        ],
    },
    {
        "title": "Технология хлебопечения",
        "description": "Профессиональный курс для пекарей и технологов. Технология приготовления теста, виды хлеба, работа с заквасками, контроль качества готовой продукции.",
        "modules": [
            {
                "title": "Сырьё и рецептуры",
                "lessons": [
                    {
                        "title": "Виды муки и их свойства",
                        "type": "text",
                        "duration": "30 мин",
                        "content": "<h2>Классификация муки</h2><p>Качество хлеба напрямую зависит от качества муки. Основные показатели:</p><ul><li><strong>Влажность</strong> — стандарт 14,5%</li><li><strong>Клейковина</strong> — не менее 28% для пшеничной муки высшего сорта</li><li><strong>Зольность</strong> — определяет сорт муки</li></ul><p>На нашем предприятии используется пшеничная мука высшего и первого сортов, а также ржаная обдирная.</p>",
                    },
                    {
                        "title": "Дрожжи и закваски",
                        "type": "text",
                        "duration": "25 мин",
                        "content": "<h2>Биологические разрыхлители</h2><p>Дрожжи — живые микроорганизмы, обеспечивающие брожение теста. Основные виды:</p><ul><li><strong>Прессованные дрожжи</strong> — влажность 75%, хранятся при 4°C до 12 суток</li><li><strong>Сухие дрожжи</strong> — влажность 8–9%, срок хранения до 1 года</li><li><strong>Закваска</strong> — используется для ржаного хлеба, поддерживается непрерывно</li></ul>",
                    },
                ],
            },
            {
                "title": "Процесс выпечки",
                "lessons": [
                    {
                        "title": "Замес и брожение теста",
                        "type": "text",
                        "duration": "35 мин",
                        "content": "<h2>Технологические этапы</h2><p>Приготовление теста включает несколько ключевых этапов:</p><ol><li><strong>Дозирование</strong> — точное взвешивание всех компонентов по рецептуре</li><li><strong>Замес</strong> — 10–15 минут до однородной консистенции</li><li><strong>Брожение</strong> — 90–180 минут при температуре 28–30°C</li><li><strong>Обминка</strong> — улучшение структуры клейковины</li><li><strong>Разделка и формовка</strong></li></ol>",
                    },
                    {
                        "title": "Выпечка и хранение",
                        "type": "text",
                        "duration": "25 мин",
                        "content": "<h2>Режимы выпечки</h2><p>Температура и время выпечки зависят от вида изделия:</p><table><thead><tr><th>Изделие</th><th>Температура</th><th>Время</th></tr></thead><tbody><tr><td>Хлеб формовой</td><td>200–220°C</td><td>45–60 мин</td></tr><tr><td>Батон</td><td>210–230°C</td><td>25–30 мин</td></tr><tr><td>Булочки</td><td>200–220°C</td><td>15–20 мин</td></tr></tbody></table><p>Готовность определяется по цвету корки, звуку при постукивании и внутренней температуре (96–98°C).</p>",
                    },
                ],
            },
        ],
    },
    {
        "title": "Работа с ERP-системой",
        "description": "Практический курс по работе с корпоративной информационной системой. Оформление заявок, учёт склада, формирование отчётов, электронный документооборот.",
        "modules": [
            {
                "title": "Введение в систему",
                "lessons": [
                    {
                        "title": "Интерфейс и навигация",
                        "type": "text",
                        "duration": "20 мин",
                        "content": "<h2>Начало работы с ERP</h2><p>ERP-система предприятия — единая платформа для управления всеми бизнес-процессами. Основные модули:</p><ul><li><strong>Склад</strong> — учёт сырья и готовой продукции</li><li><strong>Производство</strong> — планирование и выполнение заказов</li><li><strong>Кадры</strong> — учёт персонала и табельный учёт</li><li><strong>Финансы</strong> — бухгалтерский учёт и отчётность</li></ul>",
                    },
                    {
                        "title": "Оформление заявок на сырьё",
                        "type": "text",
                        "duration": "25 мин",
                        "content": "<h2>Создание заявки на материалы</h2><p>Для оформления заявки на сырьё: Склад → Заявки → Новая заявка.</p><p>Обязательные поля:</p><ul><li>Дата поставки (не менее 2 рабочих дней)</li><li>Наименование и количество</li><li>Единица измерения</li><li>Подразделение-получатель</li></ul><p>После сохранения заявка поступает на согласование к начальнику отдела.</p>",
                    },
                ],
            },
        ],
    },
    {
        "title": "Пожарная безопасность",
        "description": "Обязательный курс по пожарной безопасности. Причины пожаров на производстве, правила эвакуации, работа с огнетушителями, план действий при пожаре.",
        "modules": [
            {
                "title": "Профилактика и правила",
                "lessons": [
                    {
                        "title": "Причины возгораний на производстве",
                        "type": "text",
                        "duration": "20 мин",
                        "content": "<h2>Основные причины пожаров</h2><p>На пищевом производстве наиболее частые причины пожаров:</p><ul><li>Мучная пыль — взрывоопасна при концентрации более 50 г/м³</li><li>Неисправное электрооборудование</li><li>Перегрев хлебопекарных печей</li><li>Нарушение правил хранения масел и жиров</li><li>Несанкционированное курение</li></ul><p>Ежедневный осмотр оборудования и уборка мучной пыли — ключевые меры профилактики.</p>",
                    },
                    {
                        "title": "Эвакуация и огнетушители",
                        "type": "text",
                        "duration": "25 мин",
                        "content": "<h2>Действия при пожаре</h2><ol><li>Нажать кнопку пожарной сигнализации</li><li>Позвонить 101</li><li>Эвакуировать людей по схеме эвакуации (вывешена на каждом этаже)</li><li>Использовать огнетушитель только если пожар небольшой и есть путь отхода</li></ol><h3>Типы огнетушителей на предприятии</h3><ul><li><strong>ОП-5</strong> (порошковый) — для тушения электрооборудования под напряжением</li><li><strong>ОУ-5</strong> (углекислотный) — для серверных и электрощитовых</li></ul>",
                    },
                ],
            },
        ],
    },
]

courses_by_title: dict[str, Course] = {}

for cd in COURSES_DATA:
    course = db.query(Course).filter(Course.title == cd["title"]).first()
    if not course:
        course = Course(
            id=uid(),
            title=cd["title"],
            description=cd["description"],
            is_published=True,
        )
        db.add(course); db.commit(); db.refresh(course)

        for mi, md in enumerate(cd["modules"]):
            module = Module(id=uid(), title=md["title"], order=mi, course_id=course.id)
            db.add(module); db.commit(); db.refresh(module)

            for li, ld in enumerate(md["lessons"]):
                lesson = Lesson(
                    id=uid(),
                    title=ld["title"],
                    type=ld.get("type", "text"),
                    duration=ld.get("duration", "20 мин"),
                    order=li,
                    module_id=module.id,
                )
                db.add(lesson); db.commit(); db.refresh(lesson)

                block = Block(
                    id=uid(),
                    type=ld.get("type", "text"),
                    content=ld.get("content", ""),
                    order=0,
                    lesson_id=lesson.id,
                )
                db.add(block)

        db.commit()

    courses_by_title[cd["title"]] = db.query(Course).filter(Course.title == cd["title"]).first()

print("✓ Курсы")

# ─── 3. ПОЛЬЗОВАТЕЛИ ─────────────────────────────────────────────────────────
# (Должности упразднены: после миграции их роль выполняют группы-специальности.)

# HR
hr_user = db.query(User).filter(User.email == "hr@barhleb.by").first()
if not hr_user:
    hr_user = User(
        email="hr@barhleb.by",
        full_name="Марина Сергеевна Жук",
        hashed_password=hash_password("hr123"),
        role="hr",
        is_active=True,
        identification_number="0201985B002PB2",
    )
    db.add(hr_user); db.commit(); db.refresh(hr_user)

# Студенты (сотрудники)
STUDENTS = [
    ("Алексей Петрович Сидоров",   "sidorov@barhleb.by",   "Производственный цех"),
    ("Татьяна Ивановна Кравцова",  "kravtsova@barhleb.by", "Производственный цех"),
    ("Дмитрий Андреевич Новиков",  "novikov@barhleb.by",   "Производственный цех"),
    ("Ольга Николаевна Морозова",  "morozova@barhleb.by",  "Склад и логистика"),
    ("Игорь Васильевич Белов",     "belov@barhleb.by",     "Склад и логистика"),
    ("Светлана Юрьевна Захарова",  "zakharova@barhleb.by", "Отдел качества"),
    ("Павел Михайлович Орлов",     "orlov@barhleb.by",     "Отдел качества"),
    ("Наталья Александровна Зуева","zueva@barhleb.by",     "ИТ и администрация"),
]

student_users: list[User] = []
for full_name, email, dept_name in STUDENTS:
    u = db.query(User).filter(User.email == email).first()
    if not u:
        dept = dept_by_name.get(dept_name)
        u = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password("student123"),
            role="student",
            is_active=True,
            group_id=dept.id if dept else None,
        )
        db.add(u); db.commit(); db.refresh(u)
    student_users.append(db.query(User).filter(User.email == email).first())

print("✓ Пользователи")

# ─── 5. НАЗНАЧЕНИЯ И ПРОГРЕСС ────────────────────────────────────────────────

all_courses = list(courses_by_title.values())
cert_counter = db.query(Certificate).count()

def get_all_lessons(course: Course) -> list[Lesson]:
    lessons = []
    course_obj = db.query(Course).filter(Course.id == course.id).first()
    for mod in sorted(course_obj.modules, key=lambda m: m.order):
        for les in sorted(mod.lessons, key=lambda l: l.order):
            lessons.append(les)
    return lessons

# Сценарии назначений: (студент_index, курс_title, статус)
# статус: 'done' | 'half' | 'enrolled'
# Студент с индексом 0 (sidorov@barhleb.by) намеренно НЕ участвует в сценариях:
# это демо-аккаунт для показа — без пройденных тестов, профессия «Электрик»
# назначается в seed_electrician.py.
SCENARIOS = [
    (1, "Охрана труда на производстве",  "done"),
    (1, "Санитарные нормы и гигиена",    "half"),
    (2, "Охрана труда на производстве",  "done"),
    (2, "Технология хлебопечения",       "done"),
    (2, "Пожарная безопасность",         "enrolled"),
    (3, "Охрана труда на производстве",  "half"),
    (3, "Работа с ERP-системой",         "done"),
    (4, "Работа с ERP-системой",         "enrolled"),
    (4, "Пожарная безопасность",         "half"),
    (5, "Санитарные нормы и гигиена",    "done"),
    (5, "Охрана труда на производстве",  "enrolled"),
    (6, "Пожарная безопасность",         "done"),
    (6, "Санитарные нормы и гигиена",    "half"),
    (7, "Работа с ERP-системой",         "done"),
    (7, "Охрана труда на производстве",  "done"),
]

for s_idx, course_title, status in SCENARIOS:
    user = student_users[s_idx]
    course = courses_by_title[course_title]

    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course.id,
    ).first()

    if not enrollment:
        enrollment = Enrollment(
            user_id=user.id,
            course_id=course.id,
            assigned_by=hr_user.id,
            assigned_at=now(random.randint(-30, -3)),
            due_date=now(random.randint(10, 60)),
        )
        db.add(enrollment); db.commit(); db.refresh(enrollment)

    lessons = get_all_lessons(course)
    if not lessons:
        continue

    if status == "done":
        complete_lessons = lessons
    elif status == "half":
        complete_lessons = lessons[: max(1, len(lessons) // 2)]
    else:
        complete_lessons = []

    for les in complete_lessons:
        exists = db.query(LessonProgress).filter(
            LessonProgress.user_id == user.id,
            LessonProgress.lesson_id == les.id,
        ).first()
        if not exists:
            lp = LessonProgress(
                user_id=user.id,
                lesson_id=les.id,
                is_completed=True,
                completed_at=now(random.randint(-20, -1)),
            )
            db.add(lp)

    if status == "done":
        enrollment.completed_at = now(random.randint(-15, -1))

        cert_exists = db.query(Certificate).filter(
            Certificate.user_id == user.id,
            Certificate.course_id == course.id,
        ).first()
        if not cert_exists:
            cert_counter += 1
            cert = Certificate(
                certificate_number=f"BHP-2025-{cert_counter:06d}",
                user_id=user.id,
                course_id=course.id,
                issued_at=enrollment.completed_at,
                score=random.randint(78, 100),
            )
            db.add(cert)

db.commit()
print("✓ Назначения, прогресс и сертификаты")

# ─── Итог ────────────────────────────────────────────────────────────────────

print("\n" + "="*52)
print("  Демо-данные загружены успешно!")
print("="*52)
print(f"  Отделов:      {db.query(Group).count()}")
print(f"  Курсов:       {db.query(Course).count()}")
print(f"  Пользователей:{db.query(User).count()}")
print(f"  Назначений:   {db.query(Enrollment).count()}")
print(f"  Сертификатов: {db.query(Certificate).count()}")
print()
print("  Логины:")
print("  admin@barhleb.by  /  admin123")
print("  hr@barhleb.by     /  hr123")
print("  sidorov@barhleb.by / student123  (и другие)")
print("="*52)

db.close()
