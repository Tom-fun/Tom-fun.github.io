from pathlib import Path
out=Path(__file__).parent/'assets'/'pieces'
out.mkdir(parents=True,exist_ok=True)
# Carefully drawn Staunton-inspired vector silhouettes. Each is an individual transparent SVG image.
shapes={
'pawn': '''
  <path class="body" d="M126 264 C129 247 115 232 112 216 C107 190 127 174 150 174 C173 174 193 190 188 216 C185 232 171 247 174 264 Z"/>
  <path class="neck" d="M126 185 C133 174 132 166 130 158 L170 158 C168 168 167 177 174 185 Z"/>
  <circle class="body" cx="150" cy="119" r="39"/>
  <path class="shine" d="M127 99 C137 82 158 77 174 90 C158 85 141 95 136 111 C132 124 137 137 147 147 C125 140 115 119 127 99 Z"/>
  <path class="detail" d="M122 229 C139 239 161 239 178 229"/>
''',
'rook': '''
  <path class="body" d="M109 264 C117 244 122 220 118 193 L182 193 C178 220 183 244 191 264 Z"/>
  <path class="body" d="M101 112 L121 112 L121 92 L139 92 L139 109 L161 109 L161 92 L179 92 L179 112 L199 112 L193 151 C190 170 183 182 177 196 L123 196 C117 182 110 170 107 151 Z"/>
  <path class="neck" d="M117 151 C136 161 164 161 183 151 L180 181 C163 190 137 190 120 181 Z"/>
  <path class="shine" d="M113 120 L128 120 L128 104 L133 104 L133 127 L117 136 Z"/>
  <path class="detail" d="M125 211 L175 211 M121 244 L179 244"/>
''',
'bishop': '''
  <path class="body" d="M112 264 C122 245 128 224 125 203 C122 185 112 175 111 158 L189 158 C188 175 178 185 175 203 C172 224 178 245 188 264 Z"/>
  <path class="body" d="M150 76 C176 90 190 119 181 145 C175 166 164 179 150 185 C136 179 125 166 119 145 C110 119 124 90 150 76 Z"/>
  <path class="shine" d="M145 88 C126 108 126 140 143 160 C128 153 117 134 121 116 C124 101 133 91 145 88 Z"/>
  <path class="detail" d="M163 101 L137 143"/>
  <circle class="small" cx="150" cy="72" r="8"/>
''',
'knight': '''
  <path class="body" d="M104 265 C110 243 111 221 119 202 C126 184 139 168 151 157 C133 154 115 145 105 131 C99 122 99 108 106 98 C113 87 125 85 138 91 C149 75 170 70 187 83 C202 94 209 116 205 136 C201 157 185 175 174 193 C169 211 176 241 192 265 Z"/>
  <path class="body" d="M139 94 C134 76 135 57 146 42 C150 58 158 67 168 72 C173 58 184 48 198 46 C193 62 194 75 201 89 Z"/>
  <path class="shine" d="M119 111 C119 97 131 91 141 99 C132 105 132 120 143 130 C132 128 121 122 119 111 Z"/>
  <path class="detail" d="M172 112 C179 108 186 109 191 115"/>
  <circle class="eye" cx="177" cy="103" r="4.5"/>
  <path class="detail" d="M151 163 C163 167 178 164 188 155"/>
''',
'queen': '''
  <path class="body" d="M111 265 C120 245 124 223 122 202 C120 185 113 173 111 158 L189 158 C187 173 180 185 178 202 C176 223 180 245 189 265 Z"/>
  <path class="body" d="M115 159 C126 149 130 139 132 123 L168 123 C170 139 174 149 185 159 Z"/>
  <path class="body" d="M103 122 L119 83 L143 108 L150 66 L158 108 L182 83 L197 122 L177 137 L123 137 Z"/>
  <circle class="small" cx="103" cy="79" r="10"/><circle class="small" cx="150" cy="57" r="11"/><circle class="small" cx="197" cy="79" r="10"/>
  <path class="shine" d="M120 91 L143 114 L150 81 L151 122 L128 132 L113 117 Z"/>
  <path class="detail" d="M125 181 C140 188 160 188 175 181 M120 229 L180 229"/>
''',
'king': '''
  <path class="body" d="M109 265 C119 245 123 222 121 201 C119 183 112 170 111 155 L189 155 C188 170 181 183 179 201 C177 222 181 245 191 265 Z"/>
  <path class="body" d="M116 157 C129 146 133 132 132 118 L168 118 C167 132 171 146 184 157 Z"/>
  <path class="body" d="M123 117 C128 101 138 91 150 91 C162 91 172 101 177 117 Z"/>
  <path class="cross" d="M143 52 L157 52 L157 28 L176 28 L176 14 L157 14 L157 0 L143 0 L143 14 L124 14 L124 28 L143 28 Z" transform="translate(0 34)"/>
  <path class="shine" d="M124 136 C130 122 139 116 147 116 C136 127 135 141 141 153 L127 153 Z"/>
  <path class="detail" d="M125 188 C140 195 160 195 175 188 M120 230 L180 230"/>
'''
}

for color in ('white','black'):
    if color=='white':
        main='#f3e6c9'; mid='#d7c29c'; dark='#9f8964'; stroke='#66543a'; hi='#fff6df'; detail='#9b8054'; eye='#443624'
    else:
        main='#44484a'; mid='#25292c'; dark='#111416'; stroke='#080a0b'; hi='#82898a'; detail='#101314'; eye='#e8d8ad'
    defs=f'''<defs>
      <linearGradient id="piece" x1="0" y1="0" x2="1" y2="0.25"><stop offset="0" stop-color="{hi}"/><stop offset="0.23" stop-color="{main}"/><stop offset="0.58" stop-color="{mid}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
      <linearGradient id="base" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="{hi}"/><stop offset="0.27" stop-color="{main}"/><stop offset="0.72" stop-color="{mid}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
      <linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{hi}" stop-opacity=".72"/><stop offset="1" stop-color="{hi}" stop-opacity="0"/></linearGradient>
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
    </defs>'''
    for kind,shape in shapes.items():
        svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 350" role="img" aria-label="{color.title()} {kind}">
{defs}
  <ellipse cx="151" cy="323" rx="82" ry="9" fill="#000" opacity=".18" filter="url(#shadow)"/>
  <g stroke="{stroke}" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M78 304 C82 290 99 282 119 280 L181 280 C201 282 218 290 222 304 L218 315 C213 324 195 329 150 330 C105 329 87 324 82 315 Z" fill="url(#base)"/>
    <path d="M91 287 C107 278 125 275 150 275 C175 275 193 278 209 287 L205 295 C184 301 116 301 95 295 Z" fill="url(#piece)"/>
    <path d="M103 308 C124 314 176 314 197 308" fill="none" stroke="{hi}" stroke-opacity=".55" stroke-width="3"/>
    {shape}
    <path class="body" d="M108 264 C115 271 185 271 192 264 L202 280 C183 289 117 289 98 280 Z" fill="url(#piece)"/>
    <path d="M98 281 C119 291 181 291 202 281" fill="none" stroke="{hi}" stroke-opacity=".5" stroke-width="3"/>
  </g>
  <style>
    .body{{fill:url(#piece);stroke:{stroke};stroke-width:4.2;stroke-linejoin:round;}}
    .neck{{fill:url(#piece);stroke:{stroke};stroke-width:4.2;stroke-linejoin:round;}}
    .shine{{fill:url(#shineGrad);stroke:none;}}
    .detail{{fill:none;stroke:{detail};stroke-width:3.3;stroke-linecap:round;opacity:.88;}}
    .small{{fill:url(#base);stroke:{stroke};stroke-width:3.8;}}
    .cross{{fill:url(#base);stroke:{stroke};stroke-width:3.2;stroke-linejoin:round;}}
    .eye{{fill:{eye};stroke:{stroke};stroke-width:1.5;}}
  </style>
</svg>'''
        (out/f'{color}-{kind}.svg').write_text(svg)
print('Created', len(list(out.glob('*.svg'))), 'individual SVG pieces')
