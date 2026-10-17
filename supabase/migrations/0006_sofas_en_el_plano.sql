-- El croquis VIP ya muestra los tres sofás dibujados (120x44, giro -42): el recuadro del mapa calza con el dibujo.
update tables set map_w = 120, map_h = 44 where code in ('VIP-05', 'VIP-06', 'VIP-07');
