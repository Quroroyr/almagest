// Спокойное небо под контентными секциями: глубокий градиент, редкие звёзды, едва заметная туманность.
// u_variant меняет положение туманности, чтобы секции не были копиями; u_dim — затемнение на время церемонии карты.
uniform float u_variant;
uniform float u_dim;

void main() {
  vec2 p = viewPx();
  vec2 q = viewQ(p);
  float t = u_time;
  int O = oct(4);
  vec2 sp = p / u_px;
  // в «высоких» секциях туманность привязана к экрану, а не ко всей длине вида
  vec2 sq = sp / 900.;
  vec3 col = mix(vec3(.014, .024, .043), vec3(.022, .036, .062), .5 + .5 * sin(sq.y * .7 + u_variant));
  vec2 nc = vec2(.7 + .25 * sin(u_variant * 2.1), .4 + .2 * cos(u_variant * 1.3));
  float neb = fbm(sq * 1.3 + u_variant * 3.7, O);
  float wisps = fbm(sq * 3.1 + vec2(10. + u_variant, 4.), O);
  float mask = exp(-pow(length((sq - floor(sq / 2.4) * 2.4) - nc * 2.4) * .9, 2.));
  col += vec3(.07, .1, .15) * smoothstep(.42, .8, neb) * (.5 + .5 * wisps) * .45 * mask;
  col += starLayer(sp, 54., .42, 11. + u_variant, t, .75);
  col += starLayer(sp + 400., 26., .35, 21. + u_variant, t, .38);
  if (u_q > 1.5) col += starLayer(sp + 900., 14., .3, 31. + u_variant, t, .18);
  col *= 1. - .6 * u_dim;
  // края вида растворяются в общем фоне — без швов между секциями
  float fadePx = 160. * u_px;
  float edge = smoothstep(0., fadePx, p.y) * smoothstep(0., fadePx, u_res.y - p.y);
  col = mix(vec3(.016, .027, .05), col, edge);
  o = vec4(dither(col, p), 1.);
}
