import json
from datetime import datetime, timedelta
from ics import Calendar, Event
import pytz
import FreeSimpleGUI as fsg

# --- Translation Dictionaries ---
english_text = {
    "Fajr": "Fajr",
    "Sunrise": "Sunrise",
    "Dhuhr": "Dhuhr",
    "Asr": "Asr",
    "Maghrib": "Maghrib",
    "Isha": "Isha",
    "Training": "Training",
    "Workout between Fajr +30min and Sunrise": "Workout between Fajr +30min and Sunrise",
    "Islamic Knowledge": "Islamic Knowledge",
    "Seek knowledge between Maghrib +30min and Isha": "Seek knowledge between Maghrib +30min and Isha",
    "prayer time": "prayer time",
    "Sunrise time": "Sunrise time",
    "Generate Calendars": "Generate Calendars",
    "Select Language": "Select Language",
    "English": "English",
    "Arabic": "Arabic",
    "Operation Complete": "Operation Complete",
    "Calendars generated successfully!": "Calendars generated successfully!",
    "Error": "Error",
    "Failed to load prayer times JSON. Make sure 'prayer times 2025.json' is in the same directory.": "Failed to load prayer times JSON. Make sure 'prayer times 2025.json' is in the same directory."
}

arabic_text = {
    "Fajr": "الفَجر",
    "Sunrise": "الشُّروق",
    "Dhuhr": "الظُهر",
    "Asr": "العَصر",
    "Maghrib": "المَغرِب",
    "Isha": "العِشاء",
    "Training": "التَّدريبات",
    "Workout between Fajr +30min and Sunrise": "تَدريباتٌ مِن بَعدِ الفَجرِ حَتّى الشُّروق",
    "Islamic Knowledge": "طَلَبُ العِلمِ الشَّرعِيِّ",
    "Seek knowledge between Maghrib +30min and Isha": "طَلَبُ العِلمِ الشَّرعِيِّ بَعدَ المَغرِبِ حَتَّى العِشَاء",
    "prayer time": "وَقت صَلاةِ",
    "Sunrise time": "وَقت الشُّروق",
    "Generate Calendars": "وَلِّد التَّقويمات",
    "Select Language": "إختَر اللُّغة",
    "English": "الإنڠليزِيّة",
    "Arabic": "العَرَبِيّة",
    "Operation Complete": "العملية اكتملت",
    "Calendars generated successfully!": "تم إنشاء التقويمات بنجاح!",
    "Error": "خطأ",
    "Failed to load prayer times JSON. Make sure 'prayer times 2025.json' is in the same directory.": "فشل تحميل ملف أوقات الصلاة. تأكد من وجود ملف 'prayer times 2025.json' في نفس المجلد."
}

# --- Function to generate ICS files based on selected language ---
def generate_ics_files(language_key):
    """
    Generates .ics calendar files for prayer times and training habits
    based on the specified language.
    """
    translations = arabic_text if language_key == 'ar' else english_text

    # Configurable durations (in minutes)
    PRAYER_DURATION = 30
    SUNRISE_DURATION = 20
    TRAINING_OFFSET = 30  # minutes after Fajr

    try:
        with open("prayer times 2025.json", "r", encoding="utf-8") as f:
            data = json.load(f)["data"]
    except FileNotFoundError:
        fsg.popup_error(translations["Failed to load prayer times JSON. Make sure 'prayer times 2025.json' is in the same directory."], title=translations["Error"])
        return
    except json.JSONDecodeError:
        fsg.popup_error("Error decoding JSON from 'prayer times 2025.json'. Please check the file's content.", title=translations["Error"])
        return

    tz = pytz.timezone("Africa/Algiers")
    all_days = [day for month in data.values() for day in month]

    prayer_calendar = Calendar()
    training_calendar = Calendar()
    knowledge_calendar = Calendar()

    for day in all_days:
        timings = day["timings"]
        date_str = day["date"]["gregorian"]["date"]

        def parse_time(tstr):
            naive = datetime.strptime(f"{date_str} {tstr.split()[0]}", "%d-%m-%Y %H:%M")
            return tz.localize(naive)

        # Training event
        fajr_time = parse_time(timings["Fajr"])
        sunrise_time = parse_time(timings["Sunrise"])
        training_start = fajr_time + timedelta(minutes=TRAINING_OFFSET)
        training_end = sunrise_time

        if training_start < training_end:
            event = Event()
            event.name = translations["Training"]
            event.begin = training_start
            event.end = training_end
            event.description = translations["Workout between Fajr +30min and Sunrise"]
            event.status = "CONFIRMED"
            training_calendar.events.add(event)

        # Islamic Knowledge event
        maghrib_time = parse_time(timings["Maghrib"])
        isha_time = parse_time(timings["Isha"])
        knowledge_start = maghrib_time + timedelta(minutes=30)  # 30 minutes after Maghrib
        knowledge_end = isha_time  # Until Isha time

        if knowledge_start < knowledge_end:
            knowledge_event = Event()
            knowledge_event.name = translations["Islamic Knowledge"]
            knowledge_event.begin = knowledge_start
            knowledge_event.end = knowledge_end
            knowledge_event.description = translations["Seek knowledge between Maghrib +30min and Isha"]
            knowledge_event.status = "CONFIRMED"
            knowledge_calendar.events.add(knowledge_event)

        # Sunrise event
        sunrise_event_time = parse_time(timings["Sunrise"])
        sunrise_event = Event()
        sunrise_event.name = translations["Sunrise"]
        sunrise_event.begin = sunrise_event_time
        sunrise_event.end = sunrise_event_time + timedelta(minutes=SUNRISE_DURATION)
        sunrise_event.description = translations["Sunrise time"]
        sunrise_event.status = "CONFIRMED"
        prayer_calendar.events.add(sunrise_event)

        # Prayer events
        for prayer in ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]:
            prayer_time = parse_time(timings[prayer])
            event = Event()
            if language_key == 'ar':
                event.name = "صَلاة " + translations[prayer]  # Fixed spacing
                event.description = translations["prayer time"] + " " + translations[prayer]
            else:
                event.name = translations[prayer] + " Prayer"
                event.description = translations[prayer] + " " + translations["prayer time"]

            event.begin = prayer_time
            event.end = prayer_time + timedelta(minutes=PRAYER_DURATION)
            event.status = "CONFIRMED"
            prayer_calendar.events.add(event)

    # --- ICS Header and VTIMEZONE block ---
    def get_ics_header(calname):
        return f"""BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nX-WR-CALNAME:{calname}\nPRODID:ics.py - http://git.io/lLljaA\n{get_vtimezone_block()}"""

    def get_vtimezone_block():
        # Minimal VTIMEZONE for Africa/Algiers (no DST)
        return (
            "BEGIN:VTIMEZONE\n"
            "TZID:Africa/Algiers\n"
            "BEGIN:STANDARD\n"
            "DTSTART:19700101T000000\n"
            "TZOFFSETFROM:+0100\n"
            "TZOFFSETTO:+0100\n"
            "TZNAME:CET\n"
            "END:STANDARD\n"
            "END:VTIMEZONE\n"
        )

    def fold_ics_lines(ics_str):
        # Fold lines longer than 75 octets per RFC 5545
        lines = ics_str.splitlines()
        folded = []
        for line in lines:
            while len(line.encode('utf-8')) > 75:
                # Find split point (75 bytes, not chars)
                split_at = 75
                while len(line[:split_at].encode('utf-8')) > 75:
                    split_at -= 1
                folded.append(line[:split_at])
                line = ' ' + line[split_at:]
            folded.append(line)
        return '\r\n'.join(folded)

    def calendar_to_ics(calendar, calname):
        # Get ICS string, remove extra blank lines, add custom header, fold lines
        ics_body = str(calendar).replace('\r\n\r\n', '\r\n').replace('\n\n', '\n')
        # Remove default header
        ics_body = ics_body.split('BEGIN:VEVENT', 1)[-1]
        ics_body = 'BEGIN:VEVENT' + ics_body if 'BEGIN:VEVENT' in ics_body else ics_body
        ics = get_ics_header(calname) + '\n' + ics_body
        # Remove leading spaces in SUMMARY and DESCRIPTION
        ics = ics.replace('SUMMARY: ', 'SUMMARY:').replace('DESCRIPTION: ', 'DESCRIPTION:')
        # Remove any double blank lines
        while '\n\n' in ics:
            ics = ics.replace('\n\n', '\n')
        return fold_ics_lines(ics) + '\nEND:VCALENDAR\n'

    # Export with improved headers and formatting
    with open("training_schedule.ics", "w", encoding="utf-8") as f:
        f.write(calendar_to_ics(training_calendar, translations["Training"]))

    with open("islamic_knowledge_schedule.ics", "w", encoding="utf-8") as f:
        f.write(calendar_to_ics(knowledge_calendar, translations["Islamic Knowledge"]))

    with open("prayer_schedule.ics", "w", encoding="utf-8") as f:
        f.write(calendar_to_ics(prayer_calendar, translations["Generate Calendars"]))

    fsg.popup(translations["Calendars generated successfully!"], title=translations["Operation Complete"])

# --- FreeSimpleGUI Layout ---
fsg.theme('Black')

# Language options for the dropdown
lang_options = [english_text["English"], arabic_text["Arabic"]]
lang_map = {
    english_text["English"]: 'en',
    arabic_text["Arabic"]: 'ar'
}

layout = [
    # Language selection row: English | Dropdown | Arabic
    [
        fsg.Text(english_text["English"], font=('Helvetica', 12), expand_x=True, justification='left'),
        fsg.Combo(
            values=lang_options,
            default_value=english_text["English"], # Default to English
            key='-LANGUAGE_COMBO-',
            enable_events=True,
            readonly=True, # Prevent typing custom values
            font=('Helvetica', 10),
            size=(12, 1) # Adjust size as needed
        ),
        fsg.Text(arabic_text["Arabic"], font=('Helvetica', 12), expand_x=True, justification='right')
    ],
    # Spacer for visual separation (optional)
    [fsg.HorizontalSeparator()],
    # Generate Calendars button - full width
    [fsg.Button(english_text["Generate Calendars"], size=(20, 2), font=('Helvetica', 12), key='-GENERATE-', expand_x=True)]
]

window = fsg.Window('ICS Calendar Generator / مولد تقويمات ICS', layout, resizable=False, finalize=True)

# Function to update the generate button text based on dropdown selection
def update_generate_button_text(selected_lang_display):
    selected_lang_key = lang_map.get(selected_lang_display, 'en') # Get 'en' or 'ar'
    translations = arabic_text if selected_lang_key == 'ar' else english_text
    window['-GENERATE-'].update(translations["Generate Calendars"])

# Initial update of the button text
update_generate_button_text(window['-LANGUAGE_COMBO-'].get())

# --- Event Loop ---
while True:
    event, values = window.read()

    if event == fsg.WIN_CLOSED:
        break
    elif event == '-LANGUAGE_COMBO-':
        # Update button text when a new language is selected from the dropdown
        update_generate_button_text(values['-LANGUAGE_COMBO-'])
    elif event == '-GENERATE-':
        # Get the currently selected language key from the dropdown
        selected_language_display = values['-LANGUAGE_COMBO-']
        selected_language_key = lang_map.get(selected_language_display, 'en')
        
        generate_ics_files(selected_language_key)

window.close()