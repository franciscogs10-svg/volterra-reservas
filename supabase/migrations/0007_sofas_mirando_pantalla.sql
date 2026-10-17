-- Francisco (2026-10-17): los sofás de patrocinadores van mirando a la pantalla LED.
-- Con el giro de 0006 (-42) el largo del sofá apuntaba a la pantalla y los asientos quedaban de lado.
-- El croquis los redibuja paralelos a la baranda de la escalera (giro 48): espaldar hacia la zona de artistas,
-- asientos abiertos hacia el vacío y la pantalla. El centro de cada sofá no se mueve; el largo baja a 96
-- para que los tres quepan en fila sin tocarse.
update tables set map_w = 96, map_h = 40, map_rot = 48 where code in ('VIP-05', 'VIP-06', 'VIP-07');
