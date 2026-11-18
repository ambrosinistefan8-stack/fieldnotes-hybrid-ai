const lang = (en, de) => ({ en, de });

export const lessons = [
  {
    id: 'shade',
    title: lang('Facade inspection', 'Fassadenkontrolle'),
    intro: lang(
      'You maintain an office building. Two contact probes measure the outside surfaces of the south wall and the courtyard wall. Use the 20-minute log to write a handover the next shift can verify.',
      'Sie betreuen ein Bürogebäude. Zwei Kontaktfühler messen an den Aussenflächen der Südwand und der Hofwand. Bereiten Sie mit dem 20-Minuten-Protokoll eine nachvollziehbare Schichtübergabe vor.'
    ),
    series: [lang('South wall', 'Südwand'), lang('Courtyard wall', 'Hofwand')],
    rows: [[0, 18, 18], [10, 24, 20], [20, 30, 22]],
    unit: '°C',
    questions: [
      {
        ask: lang('The work order asks for the rise in south-wall surface temperature over 20 minutes. What do you enter?', 'Auf dem Arbeitsauftrag steht «Temperaturanstieg der Südwand in 20 Minuten». Welchen Wert tragen Sie ein?'),
        options: [lang('30 °C', '30 °C'), lang('12 °C', '12 °C'), lang('8 °C', '8 °C')],
        answer: 1, rows: [0, 2],
        hint: lang('Find the start and end of the inspection in the south-wall column. Subtract the starting reading from the final one.', 'Suchen Sie Anfang und Ende der Kontrolle in der Spalte «Südwand». Ziehen Sie den Anfangswert vom Endwert ab.'),
        alternateHint: lang('Start at the south-wall reading in the first row. How many degrees must you add to reach its reading in the last row?', 'Gehen Sie vom Südwandwert in der ersten Zeile aus. Wie viele Grad müssen Sie addieren, um den Südwandwert in der letzten Zeile zu erreichen?'),
        why: lang('The south-wall surface rose from 18 °C to 30 °C. The work order should record a rise of 12 °C.', 'Die Oberfläche der Südwand erwärmte sich von 18 °C auf 30 °C. Der Anstieg für den Arbeitsauftrag beträgt 12 °C.')
      },
      {
        ask: lang('When did the log first show the two wall surfaces 8 °C apart?', 'Bei welchem protokollierten Zeitpunkt lagen die beiden Wandoberflächen erstmals 8 °C auseinander?'),
        options: [lang('At the start', 'Zu Beginn'), lang('After 10 minutes', 'Nach 10 Minuten'), lang('After 20 minutes', 'Nach 20 Minuten')],
        answer: 2, rows: [0, 1, 2],
        hint: lang('For each time, compare the two readings on the same row. Then scan the gaps in time order.', 'Vergleichen Sie auf jeder Zeile die beiden Messwerte miteinander. Lesen Sie die Abstände dann in zeitlicher Reihenfolge.'),
        alternateHint: lang('Start at minute zero. Add 8 °C to each courtyard reading and stop at the first row where your result matches the south-wall reading.', 'Beginnen Sie bei Minute null. Addieren Sie zum jeweiligen Hofwandwert 8 °C. Stoppen Sie bei der ersten Zeile, in der Ihr Ergebnis mit dem Südwandwert übereinstimmt.'),
        why: lang('The gaps were 0 °C, 4 °C and 8 °C. The first recorded 8 °C gap was at minute 20.', 'Die Abstände betrugen 0 °C, 4 °C und 8 °C. Der erste protokollierte Abstand von 8 °C ist bei Minute 20 zu sehen.')
      },
      {
        ask: lang('Which note can the next shift verify from the probes alone?', 'Welche Übergabenotiz kann die nächste Schicht allein anhand der Fühlermessungen prüfen?'),
        options: [
          lang('At minute 20 the south-wall surface measured 30 °C and the courtyard-wall surface 22 °C.', 'Bei Minute 20 hatte die Oberfläche der Südwand 30 °C und die der Hofwand 22 °C.'),
          lang('At minute 20 the courtyard air temperature was 22 °C.', 'Die Lufttemperatur im Hof betrug bei Minute 20 genau 22 °C.'),
          lang('A fault in the insulation caused the south wall to reach 30 °C.', 'Ein Schaden an der Dämmung liess die Südwand 30 °C erreichen.')
        ],
        answer: 0, rows: [2],
        hint: lang('Check what each contact probe touched. Which note records the item measured without adding a diagnosis?', 'Prüfen Sie, worauf die beiden Kontaktfühler sassen. Welche Notiz nennt die gemessene Oberfläche, ohne eine Ursache zu unterstellen?'),
        alternateHint: lang('Read the minute 20 row together with both column headings. Choose the note whose details you can trace back to that row.', 'Lesen Sie die Zeile für Minute 20 zusammen mit beiden Spaltenüberschriften. Wählen Sie die Notiz, deren Angaben Sie in dieser Zeile wiederfinden.'),
        why: lang('The probes measured the two wall surfaces. The log contains neither an air reading nor an inspection of the insulation.', 'Die Kontaktfühler erfassten die beiden Wandoberflächen. Eine Luftmessung oder eine Prüfung der Dämmung ist im Protokoll nicht dokumentiert.')
      }
    ]
  },
  {
    id: 'cups',
    title: lang('Community kitchen handover', 'Übergabe in der Gemeinschaftsküche'),
    intro: lang(
      'Before setting up the tea station, your kitchen team tests two identical jugs with equal amounts of warm water. One jug is open and one has a lid. Prepare the cooling figures for the colleague taking over.',
      'Vor dem Einrichten der Teestation prüft Ihr Küchenteam zwei gleiche Kannen mit gleich viel warmem Wasser. Eine Kanne steht offen, die andere hat einen Deckel. Bereiten Sie die Messwerte zur Abkühlung für die Übergabe vor.'
    ),
    series: [lang('Open jug', 'Offene Kanne'), lang('Lidded jug', 'Mit Deckel')],
    rows: [[0, 72, 72], [5, 63, 68], [10, 57, 65]],
    unit: '°C',
    questions: [
      {
        ask: lang('The handover asks how much the open jug cooled in the last five minutes on the log. What do you enter?', 'Für die Übergabe ist die Abkühlung der offenen Kanne in den letzten fünf protokollierten Minuten gefragt. Was tragen Sie ein?'),
        options: [lang('15 °C', '15 °C'), lang('6 °C', '6 °C'), lang('9 °C', '9 °C')],
        answer: 1, rows: [1, 2],
        hint: lang('Find the final time and the reading five minutes earlier. Use both readings for the open jug.', 'Suchen Sie den letzten Zeitpunkt und den Messwert fünf Minuten davor. Verwenden Sie beide Werte der offenen Kanne.'),
        alternateHint: lang('Cover the first row. In the open-jug column, subtract the reading at minute 10 from the reading at minute 5.', 'Decken Sie die erste Zeile ab. Ziehen Sie in der Spalte «Offene Kanne» den Wert bei Minute 10 vom Wert bei Minute 5 ab.'),
        why: lang('Between minutes 5 and 10 the open jug fell from 63 °C to 57 °C, a drop of 6 °C.', 'Zwischen Minute 5 und Minute 10 sank die Temperatur in der offenen Kanne von 63 °C auf 57 °C, also um 6 °C.')
      },
      {
        ask: lang('Which comparison belongs in the handover for minute 10?', 'Welcher Vergleich gehört für Minute 10 ins Übergabeprotokoll?'),
        options: [
          lang('The open jug was 8 °C warmer.', 'Die offene Kanne war 8 °C wärmer.'),
          lang('The two jugs had the same temperature.', 'Beide Kannen hatten dieselbe Temperatur.'),
          lang('The lidded jug was 8 °C warmer.', 'Die Kanne mit Deckel war 8 °C wärmer.')
        ],
        answer: 2, rows: [2],
        hint: lang('Read both columns at minute 10, identify the higher value, then calculate the difference.', 'Lesen Sie bei Minute 10 beide Spalten. Bestimmen Sie zuerst den höheren Wert und dann den Unterschied.'),
        alternateHint: lang('Complete the sentence “The ___ jug was warmer by ___ °C” using the last row. Check the jug name against its column heading.', 'Ergänzen Sie mit der letzten Zeile den Satz «Die Kanne ___ war um ___ °C wärmer». Prüfen Sie die Bezeichnung der Kanne anhand der Spaltenüberschrift.'),
        why: lang('At minute 10 the lidded jug measured 65 °C and the open jug measured 57 °C. The difference was 8 °C.', 'Bei Minute 10 hatte die Kanne mit Deckel 65 °C, die offene Kanne 57 °C. Der Abstand betrug 8 °C.')
      },
      {
        ask: lang('Your colleague needs the lidded jug’s temperature at minute 15. Which entry should you make?', 'Ihre Kollegin benötigt die Temperatur der Kanne mit Deckel bei Minute 15. Welcher Eintrag passt?'),
        options: [
          lang('Record a new reading at minute 15. The last reading is 65 °C at minute 10.', 'Bei Minute 15 neu messen. Der letzte Messwert beträgt 65 °C bei Minute 10.'),
          lang('Copy 65 °C into the minute 15 slot.', '65 °C in das Feld für Minute 15 übertragen.'),
          lang('Enter 62 °C at minute 15 by continuing the last interval.', '62 °C für Minute 15 eintragen und dafür den letzten Verlauf fortschreiben.')
        ],
        answer: 0, rows: [0, 1, 2],
        hint: lang('Look for minute 15 in the time column. The log ends at minute 10. Mark minute 15 as awaiting a reading.', 'Suchen Sie in der Zeitspalte nach Minute 15. Das Protokoll endet bei Minute 10. Kennzeichnen Sie den Messwert für Minute 15 als ausstehend.'),
        alternateHint: lang('Copy the last lidded-jug reading together with its time. Leave the minute 15 temperature blank until a colleague measures it.', 'Übertragen Sie den letzten Wert der Kanne mit Deckel zusammen mit seiner Messzeit. Lassen Sie die Temperatur bei Minute 15 offen, bis sie gemessen ist.'),
        why: lang('The log ends at minute 10. Measuring again gives the next shift an observed value for minute 15.', 'Das Protokoll endet bei Minute 10. Eine neue Messung liefert der nächsten Schicht einen belegbaren Wert für Minute 15.')
      }
    ]
  }
];
