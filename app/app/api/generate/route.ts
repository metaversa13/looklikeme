import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Replicate from "replicate";
import sharp from "sharp";
import { uploadImage } from "@/lib/storage";
import { verifyTurnstileToken } from "@/lib/turnstile";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Лимиты генераций в месяц
const MONTHLY_LIMITS: Record<string, number> = {
  FREE: 5,
  BASE: 50,
  PREMIUM: 100,
  LIFETIME: 200,
};

// =============================================================================
// СИСТЕМА ПРОМПТОВ (4 шаблона)
// Шаблон 1: Только стиль → студийный фон
// Шаблон 2: Стиль + Локация → кастомный фон
// Шаблон 3: Стиль + Палитра → студийный фон + цвета
// Шаблон 4: Стиль + Локация + Палитра → кастомный фон + цвета
// =============================================================================

// =============================================================================
// ГЕНДЕРНО-СПЕЦИФИЧНЫЕ ПРОМПТЫ ДЛЯ ВСЕХ СТИЛЕЙ
// Каждый стиль содержит 30 мужских и 30 женских промптов
// =============================================================================

interface StyleOutfits {
  male: string[];
  female: string[];
}

const styleOutfits: Record<string, StyleOutfits> = {
  // =============================================================================
  // CASUAL (30 мужских + 30 женских)
  // =============================================================================
  casual: {
    male: [
  "blue straight jeans, white t-shirt, white converse sneakers",
  "terracotta high-waisted wide-leg pants, white oversized linen t-shirt, terracotta backless loafers",
  "gray chinos, white polo shirt, brown loafers",
  "chocolate brown textured knit turtleneck, cream straight-cut pants, brown flat sandals",
  "black skinny jeans, gray hoodie, white sneakers",
  "emerald green linen flared pants, white basic t-shirt, emerald minimalist sneakers",
  "white oversized shirt, blue jeans, white sneakers",
  "peach pima cotton polo shirt, white chino pants, peach thick-soled sneakers",
  "gray cargo pants, black t-shirt, gray sneakers",
  "mint organic cotton hoodie, cream high-waisted pants, mint sneakers",
  "black chino pants, white polo shirt, black loafers",
  "ochre short-sleeve linen shirt, terracotta straight-cut pants, ochre slip-on moccasins",
  "beige shorts, white t-shirt, beige sandals",
  "lavender oversized cotton t-shirt, gray-beige flared pants, lavender loafers",
  "blue straight jeans, gray t-shirt, white sneakers",
  "chocolate brown chunky knit cardigan, white t-shirt, beige wide-leg pants, brown sandals",
  "white chino pants, light blue polo shirt, white loafers",
  "cream asymmetric hem linen shirt, white pants, cream loafers",
  "black straight jeans, white hoodie, black sneakers",
  "emerald green basic t-shirt, white wide-leg pants, emerald sneakers",
  "gray turtleneck, black chino pants, gray loafers",
  "terracotta oversized recycled cotton hoodie, beige straight-cut pants, terracotta sneakers",
  "blue ripped jeans, white tank top, blue sneakers",
  "peach soft-shoulder linen blazer, white tank top, cream flared pants, peach sandals",
  "white t-shirt, black flared pants, white sneakers",
  "mint polo shirt, white chino pants, mint backless loafers",
  "olive cargo pants, white t-shirt, olive sneakers",
  "ochre merino wool turtleneck, gray-brown high-waisted pants, ochre loafers",
  "black t-shirt, gray skinny jeans, black sneakers",
  "lavender chunky knit cardigan, white t-shirt, beige straight-cut pants, lavender sandals"
    ],
    female: [
  "blue skinny jeans, white t-shirt, white sneakers",
  "terracotta high-waisted wide-leg pants, white oversized linen t-shirt, terracotta backless loafers",
  "white oversized shirt, flared jeans, white sneakers",
  "chocolate brown textured knit turtleneck, cream high-waisted wide-leg pants, brown backless loafers",
  "gray leggings, black oversized hoodie, gray sneakers",
  "emerald green silk blouse with shoulder draping, white flared pants, emerald ballet flats",
  "black straight jeans, white tank top, black sneakers",
  "peach merino wool turtleneck, cream high-waisted pants, peach ballet flats",
  "beige chino pants, white polo shirt, beige loafers",
  "mint short-sleeve linen blouse, white straight-cut pants, mint flat sandals",
  "blue ripped jeans, gray t-shirt, white sneakers",
  "ochre cotton midi dress with soft side pleats, ochre low-heel sandals",
  "white shirt dress, denim jacket, white sneakers",
  "lavender silk blouse with chest draping, gray-beige flared pants, lavender loafers",
  "gray skinny jeans, black hoodie, gray sneakers",
  "chocolate brown chunky knit cardigan, white tank top, cream wide-leg pants, brown sandals",
  "black chino pants, white polo shirt, black ballet flats",
  "cream asymmetric neckline linen midi dress, cream ballet flats",
  "white t-shirt, black flared pants, white sneakers",
  "emerald green textured knit turtleneck, white wide-leg pants, emerald ballet flats",
  "gray turtleneck, white straight-cut pants, gray ballet flats",
  "terracotta chunky knit cardigan, white tank top, beige straight-cut pants, terracotta sandals",
  "blue straight jeans, pink t-shirt, white sneakers",
  "peach asymmetric hem recycled cotton maxi dress, peach thin-strap sandals",
  "beige shorts, white t-shirt, beige sandals",
  "mint long-sleeve draped linen blouse, cream flared pants, mint backless loafers",
  "olive cargo pants, white tank top, olive sneakers",
  "ochre merino wool turtleneck, terracotta high-waisted pants, ochre flat sandals",
  "black oversized t-shirt, gray jeans, black sneakers",
  "lavender cotton midi dress with soft pleats, lavender ballet flats"
    ],
  },

  // =============================================================================
  // BUSINESS (30 мужских + 30 женских)
  // =============================================================================
  business: {
    male: [
      "charcoal gray two-piece suit, white dress shirt, black leather oxford shoes",
      "navy blue single-breasted suit, light blue dress shirt, brown leather brogues",
      "beige cotton suit, white polo shirt, brown suede loafers",
      "dark gray wool suit, light gray dress shirt, black leather monk strap shoes",
      "navy blue pinstripe suit, white dress shirt, burgundy leather oxfords",
      "charcoal gray suit, pale pink dress shirt, black leather chelsea boots",
      "dark blue textured suit, white turtleneck, brown leather derbies",
      "olive green linen suit, beige dress shirt, brown suede loafers",
      "light gray summer suit, white dress shirt, navy blue leather loafers",
      "black classic suit, white dress shirt, black patent leather oxfords",
      "terracotta cotton suit, cream dress shirt, brown leather brogues",
      "navy blue wool suit, light blue shirt, black leather oxfords",
      "beige linen suit, white polo shirt, tan leather loafers",
      "dark gray double-breasted suit, white shirt, black leather monk straps",
      "charcoal suit, burgundy dress shirt, black leather derbies",
      "navy pinstripe suit, pale blue shirt, brown leather oxfords",
      "light gray suit, white turtleneck, gray leather chelsea boots",
      "olive suit, white dress shirt, brown suede brogues",
      "dark blue suit, cream shirt, navy leather loafers",
      "black suit, light gray shirt, black leather oxfords",
      "terracotta linen suit, white shirt, brown leather loafers",
      "navy wool suit, white polo shirt, black leather brogues",
      "beige summer suit, light blue shirt, tan suede loafers",
      "charcoal suit, white turtleneck, black leather chelsea boots",
      "dark gray suit, pale pink shirt, burgundy leather oxfords",
      "navy suit, white dress shirt, brown leather monk straps",
      "light gray linen suit, beige polo shirt, gray leather loafers",
      "olive cotton suit, white shirt, brown leather derbies",
      "dark blue pinstripe suit, light blue shirt, black leather oxfords",
      "black double-breasted suit, white shirt, black patent leather brogues"
    ],
    female: [
      "charcoal gray pantsuit, white silk blouse, black leather pumps",
      "navy blue blazer, white blouse, navy straight-leg pants, nude leather pumps",
      "beige linen suit, cream silk top, beige leather slingback heels",
      "dark gray wool blazer, light gray blouse, gray pencil skirt, black leather pumps",
      "navy pinstripe pantsuit, white blouse, burgundy leather pointed-toe flats",
      "charcoal blazer, pale pink silk blouse, gray wide-leg pants, black leather ankle boots",
      "dark blue textured blazer, white turtleneck, navy pants, brown leather loafers",
      "olive green linen blazer, beige silk top, olive culottes, brown leather flats",
      "light gray summer blazer, white blouse, gray midi skirt, nude pumps",
      "black classic pantsuit, white silk blouse, black leather pointed-toe pumps",
      "terracotta blazer, cream blouse, terracotta wide-leg pants, brown leather slingbacks",
      "navy wool blazer, light blue blouse, navy pencil skirt, black pumps",
      "beige linen pantsuit, white silk camisole, tan leather loafers",
      "dark gray double-breasted blazer, white blouse, gray pants, black ankle boots",
      "charcoal blazer, burgundy silk blouse, black pencil skirt, burgundy pumps",
      "navy pinstripe blazer, pale blue blouse, navy culottes, brown leather flats",
      "light gray blazer, white turtleneck, gray wide-leg pants, gray ankle boots",
      "olive blazer, white silk blouse, olive midi skirt, brown leather pumps",
      "dark blue suit jacket, cream blouse, navy pants, navy leather loafers",
      "black blazer, light gray silk top, black pencil skirt, black pumps",
      "terracotta linen blazer, white camisole, beige pants, brown leather flats",
      "navy wool pantsuit, white blouse, black leather pumps",
      "beige summer blazer, light blue silk top, beige culottes, tan slingbacks",
      "charcoal blazer, white turtleneck, gray pants, black ankle boots",
      "dark gray blazer, pale pink blouse, gray midi skirt, burgundy flats",
      "navy blazer, white silk blouse, navy wide-leg pants, brown loafers",
      "light gray linen blazer, beige camisole, gray pencil skirt, nude pumps",
      "olive cotton blazer, white blouse, olive pants, brown leather flats",
      "dark blue pinstripe blazer, light blue silk top, navy culottes, black pumps",
      "black double-breasted pantsuit, white blouse, black pointed-toe pumps"
    ],
  },

  // =============================================================================
  // SPORT (30 мужских + 30 женских)
  // =============================================================================
  sport: {
    male: [
      "black athletic joggers, gray fitted t-shirt, black running shoes",
      "navy blue track pants, white compression shirt, navy sneakers",
      "charcoal gray sweatpants, black tank top, gray training shoes",
      "dark green athletic shorts, white performance t-shirt, green running shoes",
      "black compression leggings, gray long-sleeve top, black athletic shoes",
      "navy joggers, light blue performance shirt, navy cross-trainers",
      "gray athletic pants, black fitted tee, white running shoes",
      "olive green track pants, beige performance shirt, olive sneakers",
      "black shorts, white tank top, black training shoes",
      "charcoal sweatpants, navy compression top, gray athletic shoes",
      "dark blue joggers, white fitted tee, blue running shoes",
      "black track pants, gray performance shirt, black cross-trainers",
      "navy athletic shorts, white muscle tank, navy training shoes",
      "gray compression tights, black long-sleeve shirt, gray sneakers",
      "olive joggers, white performance tee, olive athletic shoes",
      "black sweatpants, charcoal tank top, black running shoes",
      "navy track pants, light gray fitted shirt, navy training shoes",
      "dark green athletic pants, white compression top, green sneakers",
      "black shorts, gray performance tee, black cross-trainers",
      "charcoal joggers, white fitted shirt, gray athletic shoes",
      "navy sweatpants, black tank top, navy running shoes",
      "gray track pants, white performance shirt, gray training shoes",
      "olive athletic shorts, beige compression top, olive sneakers",
      "black joggers, gray long-sleeve shirt, black athletic shoes",
      "dark blue sweatpants, white fitted tee, blue cross-trainers",
      "charcoal track pants, black performance shirt, gray training shoes",
      "navy compression tights, white muscle tank, navy sneakers",
      "green joggers, white fitted tee, green running shoes",
      "black athletic pants, gray compression top, black training shoes",
      "navy shorts, white performance shirt, navy athletic shoes"
    ],
    female: [
      "black high-waisted leggings, gray cropped sports bra, black running shoes",
      "navy blue athletic leggings, white fitted tank top, navy sneakers",
      "charcoal gray leggings, black sports bra, charcoal training shoes",
      "dark green high-waisted tights, white cropped top, green running shoes",
      "black compression leggings, gray long-sleeve crop top, black athletic shoes",
      "navy leggings, light blue fitted sports bra, navy cross-trainers",
      "gray athletic tights, black cropped tank, white running shoes",
      "olive green leggings, beige sports bra, olive sneakers",
      "black bike shorts, white cropped tee, black training shoes",
      "charcoal leggings, navy fitted tank top, gray athletic shoes",
      "dark blue high-waisted tights, white sports bra, blue running shoes",
      "black leggings, gray long-sleeve crop top, black cross-trainers",
      "navy athletic tights, white cropped tank, navy training shoes",
      "gray compression leggings, black fitted bra top, gray sneakers",
      "olive leggings, white cropped sports top, olive athletic shoes",
      "black high-waisted tights, charcoal sports bra, black running shoes",
      "navy leggings, light gray fitted crop top, navy training shoes",
      "dark green athletic leggings, white long-sleeve top, green sneakers",
      "black bike shorts, gray sports bra, black cross-trainers",
      "charcoal leggings, white fitted tank, gray athletic shoes",
      "navy high-waisted tights, black cropped top, navy running shoes",
      "gray leggings, white sports bra, gray training shoes",
      "olive athletic tights, beige fitted tank, olive sneakers",
      "black compression leggings, gray crop top, black athletic shoes",
      "dark blue leggings, white long-sleeve sports top, blue cross-trainers",
      "charcoal athletic tights, black fitted bra, gray training shoes",
      "navy compression leggings, white cropped tank, navy sneakers",
      "green high-waisted leggings, white sports bra, green running shoes",
      "black leggings, gray fitted crop top, black training shoes",
      "navy athletic tights, white tank top, navy athletic shoes"
    ],
  },

  // =============================================================================
  // STREET (30 мужских + 30 женских)
  // =============================================================================
  street: {
    male: [
      "black oversized hoodie, gray cargo pants, white chunky sneakers",
      "navy blue graphic hoodie, black baggy jeans, navy platform sneakers",
      "charcoal oversized sweatshirt, olive cargo pants, gray chunky trainers",
      "white oversized tee, black wide-leg pants, white thick-soled sneakers",
      "olive green hoodie, beige cargo pants, olive platform sneakers",
      "black graphic tee, gray parachute pants, black chunky sneakers",
      "navy oversized zip hoodie, black cargo joggers, navy trainers",
      "gray oversized crewneck, olive wide-leg pants, gray platform shoes",
      "white hoodie, black cargo pants, white chunky sneakers",
      "charcoal graphic sweatshirt, navy baggy jeans, gray trainers",
      "black oversized tee, beige cargo pants, black platform sneakers",
      "olive hoodie, gray parachute pants, olive chunky trainers",
      "navy graphic tee, black wide-leg cargo pants, navy sneakers",
      "gray oversized zip hoodie, charcoal baggy pants, gray platform shoes",
      "white oversized sweatshirt, black cargo joggers, white chunky trainers",
      "black hoodie, olive cargo pants, black platform sneakers",
      "navy oversized tee, gray parachute pants, navy chunky shoes",
      "charcoal graphic hoodie, black baggy jeans, charcoal trainers",
      "olive oversized crewneck, beige cargo pants, olive platform sneakers",
      "white graphic tee, black wide-leg pants, white chunky trainers",
      "black zip hoodie, navy cargo pants, black platform shoes",
      "gray oversized tee, olive parachute pants, gray chunky sneakers",
      "navy hoodie, black cargo joggers, navy trainers",
      "charcoal graphic sweatshirt, gray baggy pants, charcoal platform shoes",
      "white oversized hoodie, black cargo pants, white chunky trainers",
      "olive graphic tee, beige wide-leg pants, olive platform sneakers",
      "black oversized crewneck, navy parachute pants, black chunky shoes",
      "gray hoodie, charcoal cargo pants, gray trainers",
      "navy oversized tee, black baggy jeans, navy platform sneakers",
      "white graphic hoodie, gray cargo pants, white chunky trainers"
    ],
    female: [
      "black oversized hoodie, gray cargo pants, white chunky sneakers",
      "navy graphic cropped hoodie, black baggy jeans, navy platform sneakers",
      "charcoal oversized sweatshirt, olive cargo pants, gray chunky trainers",
      "white oversized tee, black wide-leg pants, white platform sneakers",
      "olive cropped hoodie, beige cargo pants, olive chunky shoes",
      "black graphic tee, gray parachute pants, black platform sneakers",
      "navy oversized zip hoodie, black cargo joggers, navy trainers",
      "gray cropped sweatshirt, olive wide-leg pants, gray chunky sneakers",
      "white hoodie, black cargo pants, white platform shoes",
      "charcoal graphic cropped top, navy baggy jeans, gray trainers",
      "black oversized tee, beige cargo pants, black chunky sneakers",
      "olive hoodie, gray parachute pants, olive platform trainers",
      "navy graphic crop top, black wide-leg cargo pants, navy sneakers",
      "gray oversized zip hoodie, charcoal baggy pants, gray chunky shoes",
      "white cropped sweatshirt, black cargo joggers, white platform sneakers",
      "black hoodie, olive cargo pants, black chunky trainers",
      "navy oversized tee, gray parachute pants, navy platform shoes",
      "charcoal graphic hoodie, black baggy jeans, charcoal trainers",
      "olive cropped crewneck, beige cargo pants, olive chunky sneakers",
      "white graphic tee, black wide-leg pants, white platform trainers",
      "black zip hoodie, navy cargo pants, black chunky shoes",
      "gray oversized crop top, olive parachute pants, gray platform sneakers",
      "navy hoodie, black cargo joggers, navy trainers",
      "charcoal graphic sweatshirt, gray baggy pants, charcoal chunky shoes",
      "white oversized hoodie, black cargo pants, white platform sneakers",
      "olive graphic crop tee, beige wide-leg pants, olive trainers",
      "black cropped sweatshirt, navy parachute pants, black chunky sneakers",
      "gray hoodie, charcoal cargo pants, gray platform trainers",
      "navy oversized tee, black baggy jeans, navy chunky shoes",
      "white graphic hoodie, gray cargo pants, white platform trainers"
    ],
  },

  // =============================================================================
  // ROMANTIC (30 мужских + 30 женских)
  // =============================================================================
  romantic: {
    male: [
      "cream linen shirt, beige chino pants, brown leather loafers",
      "soft pink cotton shirt, white pants, tan suede loafers",
      "light blue linen button-up, cream trousers, brown leather boat shoes",
      "pale lavender shirt, beige linen pants, tan leather sandals",
      "ivory silk-blend shirt, white cotton pants, cream loafers",
      "blush pink linen shirt, cream chinos, brown suede loafers",
      "soft blue cotton shirt, beige trousers, tan leather moccasins",
      "cream textured shirt, white linen pants, brown leather sandals",
      "pale pink button-up, ivory chinos, beige suede loafers",
      "light lavender linen shirt, cream pants, tan leather loafers",
      "soft cream shirt, beige cotton trousers, brown leather boat shoes",
      "blush cotton shirt, white linen pants, cream suede loafers",
      "pale blue linen button-up, cream chinos, tan leather sandals",
      "ivory shirt, beige trousers, brown leather moccasins",
      "soft pink linen shirt, white pants, cream loafers",
      "light blue cotton shirt, cream linen trousers, tan suede loafers",
      "pale lavender button-up, beige chinos, brown leather sandals",
      "cream silk-blend shirt, white cotton pants, tan leather loafers",
      "blush pink linen shirt, ivory trousers, beige suede boat shoes",
      "soft blue textured shirt, cream pants, brown leather loafers",
      "pale pink cotton shirt, beige linen trousers, cream sandals",
      "light lavender shirt, white chinos, tan leather moccasins",
      "ivory linen button-up, cream pants, brown suede loafers",
      "soft cream cotton shirt, beige trousers, tan leather sandals",
      "blush linen shirt, white cotton pants, cream leather loafers",
      "pale blue silk-blend shirt, cream chinos, beige suede loafers",
      "light pink linen shirt, ivory trousers, brown leather boat shoes",
      "soft lavender cotton shirt, beige pants, tan leather sandals",
      "cream button-up, white linen trousers, brown suede moccasins",
      "pale pink textured shirt, cream chinos, tan leather loafers"
    ],
    female: [
      "cream silk midi dress with floral print, nude leather heeled sandals",
      "soft pink chiffon maxi dress, tan strappy heels",
      "light blue floral wrap dress, cream leather ballet flats",
      "pale lavender lace midi dress, beige suede pumps",
      "ivory silk slip dress with lace trim, cream leather sandals",
      "blush pink flowy maxi dress, tan leather heeled sandals",
      "soft blue embroidered midi dress, nude ballet flats",
      "cream lace fit-and-flare dress, brown leather ankle strap heels",
      "pale pink chiffon wrap dress, beige leather sandals",
      "light lavender silk midi dress, cream suede pumps",
      "soft cream floral maxi dress, tan leather sandals",
      "blush lace cocktail dress, nude strappy heels",
      "pale blue silk slip dress, cream ballet flats",
      "ivory chiffon midi dress with ruffle details, beige heeled sandals",
      "soft pink embroidered maxi dress, tan leather flats",
      "light blue lace wrap dress, cream suede pumps",
      "pale lavender floral midi dress, nude leather sandals",
      "cream silk maxi dress, brown leather ankle strap heels",
      "blush pink chiffon fit-and-flare dress, beige strappy heels",
      "soft blue lace midi dress, tan ballet flats",
      "pale pink silk wrap dress, cream leather heeled sandals",
      "light lavender embroidered dress, nude suede pumps",
      "ivory floral maxi dress, beige leather sandals",
      "soft cream chiffon midi dress, tan strappy heels",
      "blush silk slip dress with lace, cream ballet flats",
      "pale blue lace cocktail dress, nude leather heeled sandals",
      "light pink flowy maxi dress, beige suede flats",
      "soft lavender chiffon wrap dress, tan leather pumps",
      "cream embroidered midi dress, brown leather sandals",
      "pale pink silk maxi dress, nude ankle strap heels"
    ],
  },

  // =============================================================================
  // MINIMALISM (30 мужских + 30 женских)
  // =============================================================================
  minimalism: {
    male: [
      "white cotton t-shirt, beige linen pants, white leather sneakers",
      "cream merino wool sweater, gray straight-cut trousers, cream suede loafers",
      "black turtleneck, charcoal wool pants, black leather chelsea boots",
      "ivory linen shirt, sand-colored chinos, tan leather sandals",
      "light gray cotton tee, white wide-leg pants, gray minimalist sneakers",
      "beige cashmere sweater, cream trousers, beige leather loafers",
      "white button-up shirt, black tailored pants, white leather oxfords",
      "soft gray turtleneck, beige linen trousers, gray suede loafers",
      "cream cotton t-shirt, white chinos, cream leather sneakers",
      "black merino sweater, charcoal pants, black leather derbies",
      "ivory linen shirt, beige wide-leg trousers, tan leather sandals",
      "light gray cotton button-up, white straight-cut pants, gray minimalist loafers",
      "beige turtleneck, cream linen pants, beige leather chelsea boots",
      "white cashmere sweater, gray trousers, white suede sneakers",
      "soft cream shirt, black tailored pants, cream leather loafers",
      "charcoal cotton tee, beige wide-leg pants, gray leather sandals",
      "ivory button-up, white linen trousers, tan minimalist sneakers",
      "light beige sweater, cream chinos, beige suede loafers",
      "black cotton shirt, gray straight-cut pants, black leather oxfords",
      "white turtleneck, beige wool trousers, white leather derbies",
      "cream linen tee, ivory wide-leg pants, cream leather sandals",
      "soft gray button-up, white tailored pants, gray minimalist loafers",
      "beige merino sweater, charcoal linen trousers, beige leather sneakers",
      "white cotton shirt, cream straight-cut pants, white suede chelsea boots",
      "light gray cashmere turtleneck, beige trousers, gray leather loafers",
      "ivory tee, white wide-leg pants, tan leather sandals",
      "black linen shirt, gray chinos, black minimalist sneakers",
      "cream button-up, beige tailored pants, cream suede loafers",
      "soft white sweater, ivory linen trousers, white leather derbies",
      "charcoal cotton turtleneck, black straight-cut pants, gray leather oxfords"
    ],
    female: [
      "white silk blouse, beige wide-leg linen pants, nude leather ballet flats",
      "cream cashmere sweater, ivory straight-cut trousers, cream suede loafers",
      "black turtleneck, charcoal wool midi skirt, black leather ankle boots",
      "soft beige linen shirt, white wide-leg pants, tan leather sandals",
      "light gray cotton tee, cream culottes, gray minimalist sneakers",
      "ivory merino sweater, beige tailored pants, nude leather flats",
      "white silk tank top, black high-waisted trousers, white leather loafers",
      "cream linen blouse, sand-colored wide-leg pants, beige leather sandals",
      "soft gray turtleneck, white straight-cut pants, gray suede flats",
      "beige cotton shirt, cream linen culottes, tan leather loafers",
      "black cashmere sweater, ivory midi skirt, black leather ballet flats",
      "white button-up, beige wide-leg trousers, nude minimalist sandals",
      "light cream turtleneck, gray tailored pants, cream leather ankle boots",
      "soft ivory silk top, white linen pants, tan suede loafers",
      "charcoal cotton tee, beige culottes, gray leather flats",
      "cream linen shirt, black straight-cut trousers, cream minimalist sandals",
      "white merino sweater, ivory wide-leg pants, white leather loafers",
      "beige silk blouse, cream tailored culottes, beige suede flats",
      "light gray turtleneck, white linen midi skirt, gray leather sandals",
      "soft black cotton top, charcoal wide-leg pants, black leather ballet flats",
      "ivory button-up shirt, beige straight-cut trousers, tan minimalist loafers",
      "cream cashmere turtleneck, white linen culottes, cream suede sandals",
      "white linen tee, gray tailored pants, nude leather flats",
      "beige silk tank, ivory wide-leg trousers, beige leather loafers",
      "soft gray cotton shirt, cream linen pants, gray minimalist sandals",
      "black merino sweater, beige straight-cut culottes, black suede flats",
      "white button-up blouse, charcoal tailored pants, white leather ankle boots",
      "light cream linen top, ivory wide-leg trousers, tan leather sandals",
      "soft beige turtleneck, white linen midi skirt, cream suede loafers",
      "charcoal silk blouse, gray straight-cut pants, gray leather ballet flats"
    ],
  },

  // =============================================================================
  // BOHO (30 мужских + 30 женских)
  // =============================================================================
  boho: {
    male: [
      "cream linen embroidered shirt, brown suede vest, beige wide-leg pants, tan leather sandals",
      "white cotton tunic, fringed suede jacket, blue jeans, brown boots",
      "terracotta woven shirt, beige linen pants, leather belt, tan sandals",
      "ivory embroidered kaftan-style shirt, olive cargo pants, brown leather boots",
      "light blue denim shirt, brown suede vest, cream linen pants, tan sandals",
      "beige cotton tunic with ethnic print, white wide-leg trousers, leather sandals",
      "cream linen shirt, terracotta woven vest, beige pants, brown leather boots",
      "white embroidered button-up, olive cargo pants, tan suede sandals",
      "soft brown tunic, cream linen trousers, leather belt, brown boots",
      "ivory cotton shirt with fringe details, beige wide-leg pants, tan sandals",
      "terracotta linen embroidered shirt, white pants, brown leather sandals",
      "light beige tunic, olive cargo trousers, suede boots",
      "cream kaftan-style shirt, brown linen pants, tan leather sandals",
      "white cotton vest over embroidered tee, beige wide-leg pants, brown boots",
      "soft blue linen shirt, cream trousers, leather belt, tan sandals",
      "ivory tunic with ethnic patterns, terracotta pants, brown suede sandals",
      "beige embroidered button-up, white linen trousers, tan leather boots",
      "cream cotton shirt, olive cargo pants, brown leather sandals",
      "terracotta tunic, beige wide-leg pants, leather belt, tan sandals",
      "white linen embroidered shirt, brown trousers, suede boots",
      "light blue cotton vest, cream linen pants, tan leather sandals",
      "ivory kaftan-style tunic, beige cargo pants, brown boots",
      "soft beige embroidered shirt, white wide-leg trousers, tan sandals",
      "cream linen tunic, terracotta pants, leather belt, brown sandals",
      "white cotton shirt with fringe, olive linen trousers, tan suede boots",
      "terracotta embroidered button-up, beige pants, brown leather sandals",
      "light cream tunic, white cargo trousers, tan leather boots",
      "ivory linen vest over tee, brown wide-leg pants, suede sandals",
      "beige cotton kaftan-style shirt, cream linen pants, tan leather sandals",
      "white embroidered tunic, olive trousers, brown leather boots"
    ],
    female: [
      "cream embroidered maxi dress, brown leather belt, tan suede ankle boots",
      "white linen flowy dress with lace, layered gold necklaces, brown leather sandals",
      "terracotta crochet maxi skirt, ivory peasant blouse, beige leather ankle boots",
      "soft blue floral boho dress, fringe suede vest, tan leather sandals",
      "beige linen wide-leg pants, cream embroidered crop top, brown leather belt, tan sandals",
      "ivory lace maxi dress, layered turquoise jewelry, brown suede boots",
      "light brown flowy midi skirt, white crochet top, tan leather sandals",
      "cream peasant blouse, terracotta embroidered maxi skirt, brown leather ankle boots",
      "white cotton maxi dress with embroidery, beige suede belt, tan sandals",
      "soft terracotta boho dress, layered gold necklaces, brown leather sandals",
      "beige linen flowy pants, ivory lace crop top, tan suede ankle boots",
      "cream floral maxi dress, brown leather belt, tan leather sandals",
      "white embroidered peasant blouse, blue denim maxi skirt, brown boots",
      "light beige crochet dress, layered jewelry, tan suede sandals",
      "ivory linen wide-leg pants, terracotta embroidered top, brown leather belt, tan sandals",
      "soft blue boho maxi dress, cream lace vest, brown leather ankle boots",
      "cream cotton flowy skirt, white peasant blouse, tan leather sandals",
      "terracotta embroidered maxi dress, beige suede belt, brown sandals",
      "white lace boho dress, layered gold necklaces, tan leather boots",
      "beige linen pants, ivory crochet crop top, brown leather belt, tan sandals",
      "light cream floral maxi dress, terracotta scarf, brown suede ankle boots",
      "soft white peasant blouse, beige embroidered maxi skirt, tan sandals",
      "ivory boho midi dress, layered turquoise jewelry, brown leather sandals",
      "cream lace maxi skirt, white crochet top, tan suede boots",
      "terracotta linen flowy pants, beige embroidered blouse, brown belt, tan sandals",
      "white cotton boho dress, cream lace vest, brown leather ankle boots",
      "light beige peasant top, ivory maxi skirt, tan leather sandals",
      "soft blue embroidered dress, layered gold jewelry, brown suede sandals",
      "cream crochet maxi dress, terracotta belt, tan leather boots",
      "white linen flowy pants, beige lace top, brown leather sandals"
    ],
  },

  // =============================================================================
  // GRUNGE (30 мужских + 30 женских)
  // =============================================================================
  grunge: {
    male: [
      "black ripped skinny jeans, gray band t-shirt, black leather combat boots",
      "dark blue distressed jeans, black plaid flannel shirt, brown combat boots",
      "charcoal ripped jeans, white graphic tee, black leather jacket, black boots",
      "black slim jeans, gray oversized hoodie, dark combat boots",
      "navy distressed denim, black band tee, brown leather jacket, black boots",
      "dark gray ripped jeans, charcoal plaid shirt, black combat boots",
      "black skinny jeans, white graphic tee, olive military jacket, black boots",
      "blue distressed jeans, black oversized tee, gray flannel overshirt, brown boots",
      "charcoal slim jeans, dark gray hoodie, black leather jacket, black combat boots",
      "black ripped denim, white band t-shirt, black denim jacket, black boots",
      "navy torn jeans, gray plaid flannel, brown combat boots",
      "dark blue skinny jeans, black graphic tee, charcoal hoodie, black boots",
      "black distressed jeans, white oversized tee, black leather jacket, black boots",
      "charcoal ripped jeans, gray band shirt, olive cargo jacket, brown boots",
      "navy slim jeans, black plaid shirt, black combat boots",
      "dark gray torn denim, white graphic tee, black denim jacket, black boots",
      "black skinny jeans, charcoal hoodie, brown leather jacket, black combat boots",
      "blue distressed jeans, gray band tee, black flannel overshirt, brown boots",
      "black ripped jeans, white oversized graphic tee, black boots",
      "navy torn jeans, dark gray plaid shirt, black leather jacket, black boots",
      "charcoal skinny jeans, black band t-shirt, olive military jacket, brown boots",
      "dark blue ripped denim, white graphic hoodie, black combat boots",
      "black distressed jeans, gray oversized tee, black denim jacket, black boots",
      "navy slim jeans, charcoal plaid flannel, brown leather jacket, black boots",
      "dark gray torn jeans, black band shirt, black combat boots",
      "black skinny jeans, white graphic tee, gray hoodie, black boots",
      "blue ripped denim, dark gray oversized tee, black flannel shirt, brown boots",
      "charcoal distressed jeans, black plaid shirt, black leather jacket, black boots",
      "navy torn jeans, white band tee, olive cargo jacket, black combat boots",
      "black ripped skinny jeans, gray graphic hoodie, brown boots"
    ],
    female: [
      "black ripped skinny jeans, gray oversized band tee, black leather combat boots",
      "dark blue distressed jeans, black plaid flannel shirt, brown combat boots",
      "charcoal torn jeans, white graphic crop top, black leather jacket, black boots",
      "black slim jeans, gray oversized hoodie, dark combat boots",
      "navy ripped denim, black band tee, brown leather moto jacket, black boots",
      "dark gray distressed jeans, charcoal plaid shirt, black combat boots",
      "black skinny jeans, white oversized graphic tee, olive military jacket, black boots",
      "blue torn jeans, black crop band tee, gray flannel overshirt, brown boots",
      "charcoal ripped jeans, dark gray oversized hoodie, black leather jacket, black boots",
      "black distressed denim, white band t-shirt, black denim jacket, black boots",
      "navy torn jeans, gray plaid flannel, brown combat boots",
      "dark blue skinny jeans, black graphic crop top, charcoal hoodie, black boots",
      "black ripped jeans, white oversized band tee, black leather jacket, black boots",
      "charcoal distressed jeans, gray crop tee, olive cargo jacket, brown boots",
      "navy slim jeans, black plaid shirt, black combat boots",
      "dark gray torn denim, white graphic tank, black denim jacket, black boots",
      "black skinny jeans, charcoal oversized hoodie, brown leather jacket, black boots",
      "blue ripped jeans, gray band crop tee, black flannel shirt, brown boots",
      "black distressed denim, white oversized graphic tee, black combat boots",
      "navy torn jeans, dark gray plaid shirt, black leather jacket, black boots",
      "charcoal skinny jeans, black band t-shirt, olive military jacket, brown boots",
      "dark blue ripped jeans, white graphic hoodie, black combat boots",
      "black torn denim, gray oversized tee, black denim jacket, black boots",
      "navy distressed jeans, charcoal plaid flannel, brown leather jacket, black boots",
      "dark gray ripped jeans, black band crop top, black combat boots",
      "black skinny jeans, white oversized graphic tee, gray hoodie, black boots",
      "blue torn denim, dark gray crop band tee, black flannel overshirt, brown boots",
      "charcoal distressed jeans, black plaid shirt, black leather jacket, black boots",
      "navy ripped jeans, white oversized band tee, olive cargo jacket, black boots",
      "black torn skinny jeans, gray graphic hoodie, brown combat boots"
    ],
  },

  // =============================================================================
  // PREPPY (30 мужских + 30 женских)
  // =============================================================================
  preppy: {
    male: [
      "navy blue blazer, white oxford shirt, khaki chinos, brown leather loafers",
      "light blue button-down, beige chino pants, navy sweater tied over shoulders, boat shoes",
      "white polo shirt, navy shorts, brown leather belt, tan loafers",
      "burgundy sweater vest, white dress shirt, gray trousers, brown oxfords",
      "navy cardigan, light blue oxford, khaki pants, brown penny loafers",
      "white button-up, beige chinos, navy blazer, tan leather boat shoes",
      "light pink polo, white shorts, brown leather belt, navy loafers",
      "gray sweater, white oxford shirt, navy chinos, brown leather oxfords",
      "navy polo shirt, khaki pants, brown leather loafers",
      "white dress shirt, burgundy sweater vest, gray trousers, tan oxfords",
      "light blue cardigan, white button-down, beige chinos, brown boat shoes",
      "navy blazer, pink oxford shirt, white pants, tan leather loafers",
      "white polo, navy shorts, brown belt, navy penny loafers",
      "beige sweater, light blue dress shirt, khaki trousers, brown oxfords",
      "navy button-up, white chinos, burgundy cardigan, tan loafers",
      "light pink oxford, gray pants, white sweater vest, brown leather shoes",
      "white polo shirt, beige chinos, navy blazer, tan boat shoes",
      "navy sweater, white button-down, khaki shorts, brown loafers",
      "light blue polo, white trousers, brown belt, navy oxfords",
      "burgundy cardigan, white oxford, gray chinos, tan leather loafers",
      "navy blazer, light blue shirt, beige pants, brown penny loafers",
      "white button-up, navy sweater vest, khaki trousers, tan oxfords",
      "light pink polo, white shorts, navy cardigan, brown boat shoes",
      "gray sweater, white dress shirt, burgundy tie, navy pants, brown oxfords",
      "navy oxford shirt, beige chinos, white sweater, tan loafers",
      "white polo, gray trousers, navy blazer, brown leather loafers",
      "light blue cardigan, white button-down, khaki shorts, tan boat shoes",
      "burgundy sweater, light pink oxford, white chinos, brown oxfords",
      "navy polo shirt, beige pants, brown belt, tan penny loafers",
      "white button-up, light blue sweater vest, navy trousers, brown leather loafers"
    ],
    female: [
      "navy blue blazer, white button-up blouse, khaki pleated skirt, brown leather loafers",
      "light blue oxford shirt, beige A-line skirt, navy cardigan, tan ballet flats",
      "white polo shirt, navy tennis skirt, brown leather belt, navy loafers",
      "burgundy sweater vest, white blouse, gray pleated skirt, brown oxford shoes",
      "navy cable-knit cardigan, light blue shirt, khaki midi skirt, brown penny loafers",
      "white button-down, beige chino skirt, navy blazer, tan leather ballet flats",
      "light pink polo dress, white cardigan, brown leather belt, navy loafers",
      "gray v-neck sweater, white oxford blouse, navy A-line skirt, brown flats",
      "navy polo shirt, khaki pleated skirt, brown leather loafers",
      "white blouse, burgundy sweater vest, gray midi skirt, tan oxfords",
      "light blue cardigan, white button-up, beige tennis skirt, brown ballet flats",
      "navy blazer, pink oxford shirt, white pleated skirt, tan loafers",
      "white polo dress, navy cardigan, brown belt, navy penny loafers",
      "beige cable-knit sweater, light blue shirt, khaki A-line skirt, brown oxfords",
      "navy button-up blouse, white midi skirt, burgundy cardigan, tan loafers",
      "light pink oxford shirt, gray pleated skirt, white sweater vest, brown flats",
      "white polo shirt, beige tennis skirt, navy blazer, tan ballet flats",
      "navy sweater, white button-down, khaki A-line skirt, brown loafers",
      "light blue polo dress, white cardigan, brown belt, navy oxfords",
      "burgundy cardigan, white oxford blouse, gray pleated skirt, tan leather flats",
      "navy blazer, light blue shirt, beige midi skirt, brown penny loafers",
      "white button-up, navy sweater vest, khaki pleated skirt, tan oxfords",
      "light pink polo shirt, white tennis skirt, navy cardigan, brown ballet flats",
      "gray v-neck sweater, white blouse, burgundy tie, navy A-line skirt, brown oxfords",
      "navy oxford shirt, beige pleated skirt, white cardigan, tan loafers",
      "white polo dress, gray midi skirt, navy blazer, brown leather flats",
      "light blue cardigan, white button-up, khaki tennis skirt, tan ballet flats",
      "burgundy cable-knit sweater, light pink oxford, white pleated skirt, brown oxfords",
      "navy polo shirt, beige A-line skirt, brown belt, tan penny loafers",
      "white button-down blouse, light blue sweater vest, navy midi skirt, brown loafers"
    ],
  },

  // =============================================================================
  // DISCO (30 мужских + 30 женских)
  // =============================================================================
  disco: {
    male: [
      "gold metallic shirt, black flared pants, platform shoes",
      "silver sequined jacket, white dress shirt, black wide-leg trousers, disco boots",
      "burgundy velvet blazer, black silk shirt, dark flared pants, platform heels",
      "white polyester suit with wide lapels, gold chain, platform shoes",
      "black satin shirt, silver metallic pants, black platform boots",
      "navy blue velvet suit, cream dress shirt, platform oxfords",
      "burgundy silk shirt, black flared trousers, gold platform shoes",
      "silver lamé jacket, black turtleneck, dark wide-leg pants, platform boots",
      "white sequined vest, black shirt, flared pants, disco platform shoes",
      "gold velvet blazer, burgundy silk shirt, black flared trousers, platform heels",
      "black satin suit, white dress shirt, silver tie, platform oxfords",
      "navy metallic shirt, white flared pants, navy platform shoes",
      "burgundy sequined jacket, black turtleneck, dark wide-leg trousers, platform boots",
      "silver silk shirt, black flared pants, silver platform shoes",
      "white velvet blazer, gold lamé shirt, black wide-leg trousers, platform oxfords",
      "black sequined vest, burgundy dress shirt, dark flared pants, platform heels",
      "gold satin suit, white shirt, black tie, gold platform shoes",
      "navy velvet jacket, silver metallic shirt, black flared trousers, platform boots",
      "burgundy silk blazer, white turtleneck, dark wide-leg pants, platform shoes",
      "silver sequined shirt, black flared pants, silver platform oxfords",
      "white satin suit, gold chain necklace, platform disco shoes",
      "black velvet jacket, burgundy silk shirt, black flared trousers, platform heels",
      "navy metallic blazer, white dress shirt, dark wide-leg pants, platform boots",
      "gold lamé shirt, black flared trousers, gold platform shoes",
      "burgundy sequined vest, black silk shirt, dark flared pants, platform oxfords",
      "silver velvet suit, white turtleneck, platform disco boots",
      "black satin shirt, gold metallic pants, black platform shoes",
      "white silk blazer, navy flared trousers, white platform heels",
      "burgundy velvet jacket, silver lamé shirt, black wide-leg pants, platform boots",
      "navy sequined suit, white dress shirt, gold tie, platform disco shoes"
    ],
    female: [
      "gold sequined mini dress, platform heels",
      "silver metallic halter jumpsuit, disco platform sandals",
      "burgundy velvet wrap dress, gold strappy heels",
      "white satin flared jumpsuit, silver platform shoes",
      "black sequined bodycon dress, gold ankle strap heels",
      "navy blue lamé maxi dress with high slit, silver platform heels",
      "burgundy silk halter top, gold metallic flared pants, platform sandals",
      "silver sequined mini dress, white platform boots",
      "white velvet jumpsuit, gold chain belt, disco platform heels",
      "gold metallic wrap dress, burgundy strappy platforms",
      "black satin flared pants, silver sequined top, black platform sandals",
      "navy velvet bodycon dress, gold platform heels",
      "burgundy lamé jumpsuit, silver ankle strap heels",
      "silver metallic mini dress, black platform boots",
      "white sequined halter top, gold flared pants, white platform sandals",
      "black velvet wrap dress, silver strappy heels",
      "gold satin jumpsuit, white platform disco shoes",
      "navy metallic halter dress, burgundy platform heels",
      "burgundy sequined top, black flared pants, gold platform sandals",
      "silver velvet bodycon dress, white ankle strap platforms",
      "white lamé maxi dress, gold chain accessories, silver platform heels",
      "black satin halter jumpsuit, gold platform sandals",
      "navy sequined mini dress, silver strappy platform heels",
      "burgundy metallic wrap top, white flared pants, burgundy platforms",
      "gold velvet bodycon dress, black platform heels",
      "silver satin jumpsuit, white chain belt, silver disco platforms",
      "white sequined halter dress, navy platform sandals",
      "black lamé flared pants, gold metallic top, black ankle strap heels",
      "burgundy velvet jumpsuit, silver platform disco shoes",
      "navy satin wrap dress, gold accessories, navy strappy platform heels"
    ],
  },

  // =============================================================================
  // LADYLIKE (30 мужских + 30 женских)
  // =============================================================================
  ladylike: {
    male: [
      "navy tailored suit, white dress shirt, burgundy silk tie, black oxford shoes",
      "charcoal gray three-piece suit, light blue shirt, black leather brogues",
      "black formal suit, white wing-collar shirt, black bow tie, patent leather oxfords",
      "dark blue pinstripe suit, pale pink shirt, navy silk tie, brown leather derbies",
      "gray wool suit, white dress shirt, burgundy pocket square, black oxfords",
      "navy double-breasted blazer, white shirt, gray trousers, brown brogues",
      "charcoal suit, light gray shirt, black silk tie, black leather monk straps",
      "dark gray three-piece suit, white shirt, burgundy tie, brown oxford shoes",
      "black tuxedo-style suit, white shirt, black bow tie, patent leather shoes",
      "navy wool suit, pale blue shirt, burgundy silk tie, black brogues",
      "gray pinstripe suit, white dress shirt, navy pocket square, brown oxfords",
      "charcoal double-breasted suit, light blue shirt, black leather derbies",
      "dark blue suit, white wing-collar shirt, navy silk tie, black oxfords",
      "black three-piece suit, white shirt, gray tie, patent leather brogues",
      "navy tailored blazer, pink dress shirt, gray trousers, brown monk straps",
      "charcoal suit, white shirt, burgundy bow tie, black leather oxfords",
      "gray wool three-piece suit, light blue shirt, black silk tie, brown shoes",
      "dark navy pinstripe suit, white dress shirt, burgundy tie, black brogues",
      "black double-breasted suit, pale pink shirt, black leather derbies",
      "navy suit, white shirt, gray silk tie, brown oxford shoes",
      "charcoal tailored suit, light blue shirt, navy pocket square, black monk straps",
      "gray three-piece suit, white wing-collar shirt, black bow tie, brown oxfords",
      "dark blue wool suit, white dress shirt, burgundy silk tie, black brogues",
      "black formal suit, light gray shirt, black tie, patent leather derbies",
      "navy pinstripe blazer, white shirt, gray trousers, brown leather oxfords",
      "charcoal double-breasted suit, pale blue shirt, black silk tie, black shoes",
      "gray suit, white dress shirt, burgundy pocket square, brown brogues",
      "dark navy three-piece suit, light blue shirt, black tie, black oxfords",
      "black tailored suit, white wing-collar shirt, navy bow tie, patent leather shoes",
      "navy wool suit, pink dress shirt, gray silk tie, brown monk straps"
    ],
    female: [
      "navy fitted sheath dress, pearl necklace, black leather pumps",
      "pale pink A-line midi dress, white blazer, nude patent leather heels",
      "black cocktail dress with lace details, pearl earrings, black suede pumps",
      "ivory silk blouse, navy pencil skirt, burgundy belt, nude leather heels",
      "light blue fit-and-flare dress, white cardigan, black leather pumps",
      "burgundy sheath dress, pearl accessories, black patent heels",
      "white tailored dress with cap sleeves, navy belt, nude pumps",
      "navy tweed jacket, white blouse, gray pencil skirt, black leather heels",
      "pale pink silk midi dress, pearl necklace, nude patent pumps",
      "black A-line dress, white collar detail, burgundy suede heels",
      "ivory sheath dress, navy blazer, pearl earrings, black leather pumps",
      "light blue tailored dress, white accessories, nude patent heels",
      "burgundy fit-and-flare dress, black belt, black suede pumps",
      "navy pencil dress, white collar, pearl necklace, nude leather heels",
      "pale pink tweed jacket, white blouse, black skirt, black patent pumps",
      "white cocktail dress, navy accessories, burgundy suede heels",
      "black silk blouse, ivory pencil skirt, pearl belt, black leather pumps",
      "navy midi dress with lace trim, white cardigan, nude patent heels",
      "light blue sheath dress, pearl accessories, black suede pumps",
      "burgundy A-line dress, white blazer, black leather heels",
      "ivory fit-and-flare dress, navy belt, nude pumps",
      "pale pink silk blouse, black pencil skirt, pearl necklace, black patent heels",
      "navy tailored dress, white collar detail, burgundy suede pumps",
      "white tweed jacket, light blue blouse, gray skirt, black leather heels",
      "black sheath dress, pearl earrings, nude patent pumps",
      "burgundy midi dress, white cardigan, black suede heels",
      "navy cocktail dress, ivory accessories, black leather pumps",
      "pale pink A-line dress, black blazer, nude leather heels",
      "ivory silk dress, navy belt, pearl necklace, black patent pumps",
      "light blue pencil dress, white collar, burgundy accessories, nude suede heels"
    ],
  },

  // =============================================================================
  // SCANDINAVIAN (30 мужских + 30 женских)
  // =============================================================================
  scandinavian: {
    male: [
      "cream linen shirt, beige chino pants, brown leather sandals",
      "white cotton t-shirt, gray linen trousers, minimalist white sneakers",
      "light gray merino sweater, beige straight-cut pants, tan leather loafers",
      "ivory linen button-up, white wide-leg trousers, cream leather sandals",
      "soft beige cotton shirt, cream linen pants, brown suede loafers",
      "white linen tee, gray chinos, white minimalist sneakers",
      "light gray turtleneck, beige wool trousers, tan leather oxfords",
      "cream cotton button-up, white straight-cut pants, brown leather sandals",
      "ivory merino sweater, light gray linen trousers, cream suede loafers",
      "beige linen shirt, white wide-leg pants, tan leather sandals",
      "white cotton tee, cream chinos, gray minimalist sneakers",
      "light gray button-up, beige straight-cut trousers, brown leather loafers",
      "cream linen sweater, white wool pants, tan suede oxfords",
      "ivory cotton shirt, gray linen trousers, cream leather sandals",
      "soft beige turtleneck, white wide-leg pants, brown leather loafers",
      "white linen button-up, light gray chinos, white minimalist sneakers",
      "cream merino tee, beige straight-cut trousers, tan leather sandals",
      "light gray cotton shirt, ivory linen pants, gray suede loafers",
      "beige linen sweater, white wool trousers, brown leather oxfords",
      "white button-up, cream wide-leg pants, tan leather sandals",
      "ivory cotton tee, light gray chinos, cream minimalist sneakers",
      "soft beige linen shirt, white straight-cut trousers, brown suede loafers",
      "cream turtleneck, gray linen pants, tan leather sandals",
      "white merino sweater, beige wool trousers, white leather oxfords",
      "light gray linen button-up, ivory wide-leg pants, gray suede sandals",
      "beige cotton tee, cream chinos, brown leather loafers",
      "white linen shirt, soft gray trousers, tan minimalist sneakers",
      "ivory button-up, beige straight-cut pants, cream leather sandals",
      "cream cotton sweater, white linen trousers, brown suede oxfords",
      "light gray tee, beige wide-leg pants, tan leather sandals"
    ],
    female: [
      "cream linen midi dress, brown leather belt, tan flat sandals",
      "white cotton oversized shirt, beige linen pants, minimalist white sneakers",
      "light gray merino sweater, ivory straight-cut trousers, tan leather loafers",
      "soft beige linen blouse, white wide-leg pants, cream leather sandals",
      "ivory cotton t-shirt, gray linen culottes, brown suede ballet flats",
      "white oversized linen dress, beige leather belt, tan flat sandals",
      "light gray turtleneck, cream wool midi skirt, gray suede ankle boots",
      "beige cotton blouse, white linen wide-leg pants, brown leather sandals",
      "cream merino sweater dress, tan leather belt, ivory ballet flats",
      "white linen shirt, light gray straight-cut pants, cream minimalist loafers",
      "ivory cotton midi dress, beige leather sandals",
      "soft beige oversized tee, white linen culottes, tan flat sandals",
      "light gray linen blouse, cream wide-leg trousers, gray suede flats",
      "white merino sweater, beige wool midi skirt, brown leather ankle boots",
      "cream cotton shirt dress, ivory belt, tan leather sandals",
      "beige linen turtleneck, white straight-cut pants, cream ballet flats",
      "white oversized cotton tee, light gray linen culottes, tan minimalist sandals",
      "ivory linen midi dress, brown leather belt, beige suede flats",
      "soft gray merino sweater, cream wool trousers, gray leather loafers",
      "white cotton blouse, beige linen wide-leg pants, tan flat sandals",
      "light beige linen dress, cream belt, brown leather sandals",
      "cream turtleneck, white wool midi skirt, tan suede ankle boots",
      "ivory cotton shirt, gray linen straight-cut pants, cream ballet flats",
      "white linen oversized tee, beige culottes, gray minimalist sandals",
      "soft beige merino sweater dress, tan leather belt, brown suede flats",
      "light gray cotton blouse, white linen wide-leg trousers, ivory loafers",
      "cream linen midi dress, beige leather sandals",
      "white turtleneck, light gray wool pants, tan leather ankle boots",
      "ivory oversized linen shirt, cream straight-cut trousers, beige ballet flats",
      "soft beige cotton dress, white belt, brown leather flat sandals"
    ],
  },

  // =============================================================================
  // GAUCHO (30 мужских + 30 женских)
  // =============================================================================
  gaucho: {
    male: [
      "white linen shirt, brown leather vest, beige gaucho pants, tall leather boots",
      "cream cotton shirt, wide brown leather belt, olive gaucho trousers, brown riding boots",
      "ivory linen button-up, tan suede vest, beige wide-leg pants, leather cowboy boots",
      "white cotton shirt, brown woven belt, cream gaucho pants, tall tan boots",
      "light beige linen shirt, leather shoulder vest, olive wide-leg trousers, brown boots",
      "cream button-up, wide brown belt with buckle, beige gaucho pants, leather riding boots",
      "white linen shirt, tan leather vest, ivory wide-leg trousers, brown cowboy boots",
      "soft beige cotton shirt, brown woven belt, cream gaucho pants, tall leather boots",
      "ivory linen button-up, leather vest, olive wide-leg pants, tan riding boots",
      "white shirt, wide brown leather belt, beige gaucho trousers, brown boots",
      "cream linen shirt, tan suede vest, ivory wide-leg pants, leather cowboy boots",
      "light beige button-up, brown woven belt, cream gaucho pants, tall brown boots",
      "white cotton shirt, leather shoulder vest, olive trousers, tan riding boots",
      "ivory linen shirt, wide brown belt, beige wide-leg pants, brown leather boots",
      "cream button-up, tan leather vest, white gaucho trousers, cowboy boots",
      "soft beige linen shirt, brown woven belt, ivory wide-leg pants, tall leather boots",
      "white cotton shirt, leather vest, cream gaucho pants, brown riding boots",
      "light beige button-up, wide tan belt, olive wide-leg trousers, leather boots",
      "ivory linen shirt, brown suede vest, beige gaucho pants, tall brown boots",
      "cream cotton shirt, leather belt, white wide-leg trousers, tan cowboy boots",
      "white linen button-up, tan vest, ivory gaucho pants, brown riding boots",
      "soft beige shirt, wide brown belt, cream wide-leg trousers, leather boots",
      "light beige linen shirt, leather shoulder vest, olive gaucho pants, tall tan boots",
      "white cotton button-up, brown woven belt, beige wide-leg pants, brown boots",
      "ivory shirt, tan leather vest, cream gaucho trousers, cowboy boots",
      "cream linen shirt, wide brown belt, white wide-leg pants, leather riding boots",
      "soft beige cotton shirt, leather vest, ivory gaucho pants, tall brown boots",
      "white button-up, brown suede vest, beige wide-leg trousers, tan boots",
      "light beige linen shirt, wide leather belt, cream gaucho pants, brown cowboy boots",
      "ivory cotton shirt, tan vest, olive wide-leg trousers, leather riding boots"
    ],
    female: [
      "white linen blouse, brown leather corset vest, beige gaucho pants, tall leather boots",
      "cream cotton shirt, wide brown belt, olive gaucho trousers, brown riding boots",
      "ivory silk blouse, tan suede vest, beige wide-leg pants, leather cowboy boots",
      "white peasant top, brown woven belt, cream gaucho pants, tall tan boots",
      "light beige linen shirt, leather corset, olive wide-leg trousers, brown boots",
      "cream embroidered blouse, wide brown belt, beige gaucho pants, leather riding boots",
      "white cotton top, tan leather vest, ivory wide-leg trousers, brown cowboy boots",
      "soft beige linen blouse, brown woven belt, cream gaucho pants, tall leather boots",
      "ivory peasant shirt, leather corset vest, olive wide-leg pants, tan riding boots",
      "white blouse, wide brown leather belt, beige gaucho trousers, brown boots",
      "cream silk top, tan suede vest, ivory wide-leg pants, leather cowboy boots",
      "light beige cotton blouse, brown woven belt, cream gaucho pants, tall brown boots",
      "white linen shirt, leather corset, olive trousers, tan riding boots",
      "ivory embroidered top, wide brown belt, beige wide-leg pants, brown leather boots",
      "cream peasant blouse, tan leather vest, white gaucho trousers, cowboy boots",
      "soft beige silk shirt, brown woven belt, ivory wide-leg pants, tall leather boots",
      "white cotton blouse, leather vest, cream gaucho pants, brown riding boots",
      "light beige linen top, wide tan belt, olive wide-leg trousers, leather boots",
      "ivory silk blouse, brown suede vest, beige gaucho pants, tall brown boots",
      "cream cotton shirt, leather belt, white wide-leg trousers, tan cowboy boots",
      "white embroidered blouse, tan corset vest, ivory gaucho pants, brown riding boots",
      "soft beige peasant top, wide brown belt, cream wide-leg trousers, leather boots",
      "light beige linen blouse, leather corset, olive gaucho pants, tall tan boots",
      "white cotton top, brown woven belt, beige wide-leg pants, brown boots",
      "ivory silk shirt, tan leather vest, cream gaucho trousers, cowboy boots",
      "cream linen blouse, wide brown belt, white wide-leg pants, leather riding boots",
      "soft beige cotton top, leather corset vest, ivory gaucho pants, tall brown boots",
      "white peasant blouse, brown suede vest, beige wide-leg trousers, tan boots",
      "light beige silk shirt, wide leather belt, cream gaucho pants, brown cowboy boots",
      "ivory embroidered top, tan vest, olive wide-leg trousers, leather riding boots"
    ],
  },

  // =============================================================================
  // URBAN-CHIC (30 мужских + 30 женских)
  // =============================================================================
  "urban-chic": {
    male: [
      "black leather jacket, white t-shirt, dark blue slim jeans, black chelsea boots",
      "gray wool overcoat, black turtleneck, charcoal trousers, brown leather oxfords",
      "navy bomber jacket, white button-up, black chinos, gray suede sneakers",
      "charcoal blazer, black crew neck, dark jeans, black leather loafers",
      "black denim jacket, gray t-shirt, navy slim pants, white minimalist sneakers",
      "brown leather jacket, white shirt, beige chinos, brown chelsea boots",
      "dark gray wool coat, black turtleneck, charcoal trousers, black leather derbies",
      "navy quilted jacket, white tee, black jeans, gray suede loafers",
      "black blazer, dark gray crew neck, navy chinos, black leather sneakers",
      "charcoal bomber, white button-up, black slim pants, brown oxfords",
      "brown leather jacket, black turtleneck, dark blue jeans, black chelsea boots",
      "gray overcoat, white t-shirt, charcoal trousers, gray leather loafers",
      "navy leather jacket, black shirt, dark jeans, navy suede sneakers",
      "black wool coat, gray crew neck, black chinos, brown leather derbies",
      "charcoal blazer, white tee, navy slim pants, black minimalist sneakers",
      "dark gray bomber, black turtleneck, charcoal trousers, gray chelsea boots",
      "brown jacket, white button-up, black jeans, tan leather oxfords",
      "black overcoat, gray crew neck, dark blue chinos, black suede loafers",
      "navy blazer, white t-shirt, charcoal slim pants, navy leather sneakers",
      "charcoal leather jacket, black shirt, dark jeans, gray chelsea boots",
      "gray wool coat, white turtleneck, black trousers, brown leather derbies",
      "black bomber, dark gray tee, navy chinos, black minimalist sneakers",
      "brown leather blazer, white crew neck, charcoal pants, tan suede loafers",
      "navy overcoat, black t-shirt, dark blue jeans, navy leather oxfords",
      "charcoal jacket, gray button-up, black slim pants, gray chelsea boots",
      "black wool blazer, white turtleneck, dark chinos, black leather sneakers",
      "dark gray leather jacket, black crew neck, navy trousers, brown suede loafers",
      "brown bomber, white tee, charcoal jeans, tan leather chelsea boots",
      "navy coat, black shirt, dark blue chinos, navy minimalist sneakers",
      "gray leather jacket, white turtleneck, black slim pants, gray oxford shoes"
    ],
    female: [
      "black leather moto jacket, white silk blouse, dark blue skinny jeans, black ankle boots",
      "gray wool coat, black turtleneck, charcoal tailored pants, nude leather pumps",
      "navy bomber jacket, white tee, black slim pants, gray suede sneakers",
      "charcoal blazer, black crew neck top, dark jeans, black leather loafers",
      "black denim jacket, gray silk tank, navy skinny jeans, white minimalist sneakers",
      "brown leather jacket, white blouse, beige tailored pants, brown ankle boots",
      "dark gray trench coat, black turtleneck, charcoal culottes, black leather flats",
      "navy quilted jacket, white tee, black jeans, gray suede loafers",
      "black structured blazer, dark gray silk top, navy slim pants, black leather pumps",
      "charcoal bomber, white button-up, black skinny jeans, brown ankle boots",
      "brown leather moto jacket, black turtleneck, dark blue jeans, black heeled boots",
      "gray wool overcoat, white silk blouse, charcoal tailored pants, gray leather flats",
      "navy leather jacket, black tee, dark jeans, navy suede sneakers",
      "black belted coat, gray crew neck, black slim pants, brown leather loafers",
      "charcoal blazer, white tank top, navy skinny jeans, black minimalist sneakers",
      "dark gray bomber, black turtleneck, charcoal tailored pants, gray ankle boots",
      "brown jacket, white silk blouse, black jeans, tan leather pumps",
      "black overcoat, gray turtleneck, dark blue culottes, black suede flats",
      "navy blazer, white tee, charcoal slim pants, navy leather sneakers",
      "charcoal leather jacket, black crew neck, dark jeans, gray heeled boots",
      "gray trench coat, white silk tank, black tailored pants, brown leather flats",
      "black bomber, dark gray blouse, navy skinny jeans, black minimalist sneakers",
      "brown leather blazer, white turtleneck, charcoal pants, tan suede loafers",
      "navy wool coat, black silk top, dark blue jeans, navy leather ankle boots",
      "charcoal jacket, gray button-up, black slim pants, gray leather pumps",
      "black structured blazer, white turtleneck, dark tailored pants, black suede sneakers",
      "dark gray leather moto jacket, black crew neck, navy culottes, brown loafers",
      "brown bomber, white tee, charcoal jeans, tan leather ankle boots",
      "navy coat, black silk blouse, dark blue slim pants, navy minimalist flats",
      "gray leather jacket, white turtleneck, black skinny jeans, gray heeled boots"
    ],
  },

  // =============================================================================
  // EVENING-ELEGANT (30 мужских + 30 женских)
  // =============================================================================
  "evening-elegant": {
    male: [
      "black tuxedo, white dress shirt, black bow tie, patent leather oxford shoes",
      "navy blue dinner jacket, white wing-collar shirt, black silk bow tie, black dress shoes",
      "charcoal gray tuxedo, white pleated shirt, black satin bow tie, patent leather shoes",
      "black velvet dinner jacket, white dress shirt, burgundy bow tie, black oxfords",
      "midnight blue tuxedo, white wing-collar shirt, black silk tie, patent leather shoes",
      "black shawl-collar tuxedo, white pleated shirt, black bow tie, black dress shoes",
      "navy velvet blazer, white dress shirt, black silk bow tie, patent leather oxfords",
      "charcoal tuxedo, white shirt, burgundy silk tie, black dress shoes",
      "black peak-lapel dinner jacket, white wing-collar shirt, black bow tie, patent shoes",
      "midnight blue velvet tuxedo, white pleated shirt, navy bow tie, black oxfords",
      "black classic tuxedo, white dress shirt, black satin bow tie, patent leather shoes",
      "navy dinner jacket, white wing-collar shirt, burgundy silk tie, black dress shoes",
      "charcoal velvet blazer, white shirt, black bow tie, patent leather oxfords",
      "black shawl-collar jacket, white pleated shirt, black silk tie, black dress shoes",
      "midnight blue tuxedo, white dress shirt, black bow tie, patent leather shoes",
      "navy peak-lapel dinner jacket, white wing-collar shirt, navy silk tie, black oxfords",
      "black tuxedo, white shirt, burgundy bow tie, patent leather dress shoes",
      "charcoal dinner jacket, white pleated shirt, black satin bow tie, black oxfords",
      "black velvet tuxedo, white wing-collar shirt, black silk tie, patent shoes",
      "navy blue classic tuxedo, white dress shirt, black bow tie, black dress shoes",
      "midnight blue velvet blazer, white shirt, navy bow tie, patent leather oxfords",
      "black shawl-collar tuxedo, white pleated shirt, burgundy silk tie, black shoes",
      "charcoal peak-lapel jacket, white wing-collar shirt, black bow tie, patent oxfords",
      "navy velvet dinner jacket, white dress shirt, black silk tie, black dress shoes",
      "black classic tuxedo, white shirt, black satin bow tie, patent leather shoes",
      "midnight blue tuxedo, white pleated shirt, navy silk bow tie, black oxfords",
      "charcoal velvet blazer, white wing-collar shirt, black bow tie, patent shoes",
      "black dinner jacket, white dress shirt, burgundy silk tie, black dress shoes",
      "navy shawl-collar tuxedo, white shirt, black bow tie, patent leather oxfords",
      "midnight blue velvet tuxedo, white pleated shirt, black satin tie, black dress shoes"
    ],
    female: [
      "black floor-length evening gown with sequin details, diamond earrings, black satin heels",
      "navy blue silk maxi dress with high slit, silver clutch, nude strappy heels",
      "burgundy velvet gown with draped neckline, gold jewelry, burgundy satin pumps",
      "emerald green satin evening dress, diamond necklace, black strappy heels",
      "black lace mermaid gown, pearl earrings, black patent leather heels",
      "midnight blue sequined dress, silver accessories, navy satin pumps",
      "burgundy chiffon maxi dress with cape sleeves, gold clutch, nude heels",
      "black silk column gown, diamond jewelry, black satin strappy heels",
      "navy velvet evening dress with off-shoulder detail, silver clutch, navy pumps",
      "emerald satin gown with side draping, gold earrings, black heels",
      "black sequined mermaid dress, diamond necklace, black patent pumps",
      "burgundy silk maxi dress, gold jewelry, burgundy satin heels",
      "midnight blue lace gown, silver accessories, nude strappy heels",
      "black velvet evening dress with plunging neckline, pearl clutch, black satin pumps",
      "navy chiffon maxi dress with empire waist, diamond earrings, navy heels",
      "emerald green sequined gown, gold clutch, black strappy heels",
      "burgundy velvet mermaid dress, diamond jewelry, burgundy patent pumps",
      "black silk maxi dress with slit, silver necklace, black satin heels",
      "midnight blue satin column gown, gold accessories, navy strappy heels",
      "navy lace evening dress with illusion neckline, diamond clutch, nude pumps",
      "black chiffon gown with flowing train, pearl earrings, black satin heels",
      "emerald velvet maxi dress, gold jewelry, black patent pumps",
      "burgundy sequined evening dress, silver clutch, burgundy strappy heels",
      "midnight blue silk mermaid gown, diamond necklace, navy satin pumps",
      "black satin column dress with cape detail, gold earrings, black heels",
      "navy velvet gown with deep V-neck, silver accessories, navy patent pumps",
      "emerald lace evening dress, diamond jewelry, black satin strappy heels",
      "burgundy chiffon maxi dress with ruffle details, gold clutch, nude pumps",
      "black sequined column gown, pearl necklace, black patent heels",
      "midnight blue satin mermaid dress, silver jewelry, navy satin strappy heels"
    ],
  },

  // =============================================================================
  // GLAMOUR (30 мужских + 30 женских)
  // =============================================================================
  glamour: {
    male: [
      "black velvet blazer, white silk shirt, black dress pants, patent leather shoes",
      "navy blue sequined jacket, white dress shirt, black trousers, black oxfords",
      "burgundy velvet suit, white silk shirt, gold accessories, black dress shoes",
      "black satin lapel tuxedo, white wing-collar shirt, diamond cufflinks, patent shoes",
      "charcoal metallic blazer, black silk shirt, dark trousers, black leather oxfords",
      "midnight blue velvet suit, white dress shirt, silver accessories, patent shoes",
      "black sequined dinner jacket, white silk shirt, black pants, black dress shoes",
      "burgundy satin blazer, white shirt, gold chain, black trousers, patent oxfords",
      "navy velvet tuxedo, white wing-collar shirt, diamond studs, black dress shoes",
      "black metallic jacket, white silk shirt, charcoal pants, patent leather shoes",
      "charcoal velvet suit, black dress shirt, silver accessories, black oxfords",
      "midnight blue sequined blazer, white silk shirt, navy trousers, patent shoes",
      "burgundy velvet dinner jacket, white shirt, gold cufflinks, black pants, dress shoes",
      "black satin suit, white wing-collar shirt, diamond accessories, patent oxfords",
      "navy metallic blazer, white silk shirt, black trousers, black dress shoes",
      "charcoal sequined jacket, black shirt, dark pants, patent leather oxfords",
      "burgundy velvet tuxedo, white dress shirt, gold jewelry, black dress shoes",
      "black velvet suit, white silk shirt, silver cufflinks, patent shoes",
      "midnight blue satin blazer, white wing-collar shirt, diamond studs, black oxfords",
      "navy velvet dinner jacket, white dress shirt, gold accessories, patent shoes",
      "black metallic suit, white silk shirt, charcoal trousers, black dress shoes",
      "charcoal velvet blazer, black silk shirt, silver jewelry, patent oxfords",
      "burgundy sequined jacket, white dress shirt, gold chain, black pants, dress shoes",
      "midnight blue velvet suit, white shirt, diamond cufflinks, patent leather shoes",
      "black satin dinner jacket, white silk shirt, silver accessories, black oxfords",
      "navy metallic tuxedo, white wing-collar shirt, gold studs, patent shoes",
      "charcoal velvet suit, white dress shirt, diamond jewelry, black dress shoes",
      "burgundy satin blazer, black silk shirt, gold cufflinks, dark pants, patent oxfords",
      "black sequined suit, white shirt, silver accessories, patent leather dress shoes",
      "midnight blue metallic jacket, white silk shirt, navy trousers, black oxfords"
    ],
    female: [
      "gold sequined mini dress, diamond earrings, gold strappy heels",
      "black velvet bodycon dress with deep V, silver clutch, black satin pumps",
      "burgundy satin gown with side slit, gold jewelry, burgundy patent heels",
      "silver metallic halter dress, diamond necklace, silver strappy heels",
      "navy sequined maxi dress, gold accessories, navy satin pumps",
      "black lace mini dress with sequin overlay, diamond earrings, black patent heels",
      "emerald velvet bodycon dress, gold clutch, black strappy heels",
      "burgundy sequined mermaid gown, diamond jewelry, burgundy satin pumps",
      "gold metallic wrap dress, black accessories, gold patent heels",
      "navy velvet maxi dress with plunging neckline, silver clutch, navy strappy heels",
      "black satin slip dress, diamond necklace, black satin pumps",
      "burgundy lace bodycon dress, gold earrings, burgundy patent heels",
      "silver sequined mini dress, diamond bracelet, silver strappy heels",
      "midnight blue velvet gown, gold jewelry, navy satin pumps",
      "black metallic bodycon dress, diamond clutch, black patent heels",
      "emerald sequined maxi dress, gold accessories, black strappy heels",
      "burgundy satin mini dress, diamond earrings, burgundy satin pumps",
      "gold velvet wrap dress, black clutch, gold patent heels",
      "navy metallic bodycon dress, silver jewelry, navy strappy heels",
      "black sequined mermaid gown, diamond necklace, black satin pumps",
      "burgundy velvet maxi dress with cut-outs, gold clutch, burgundy patent heels",
      "silver satin slip dress, diamond earrings, silver strappy heels",
      "midnight blue sequined bodycon dress, gold accessories, navy satin pumps",
      "black velvet mini dress, diamond jewelry, black patent heels",
      "emerald metallic gown, gold clutch, black strappy heels",
      "burgundy sequined wrap dress, diamond bracelet, burgundy satin pumps",
      "gold lace bodycon dress, black accessories, gold patent heels",
      "navy velvet bodycon dress, silver jewelry, navy strappy heels",
      "black satin mermaid gown, diamond earrings, black satin pumps",
      "silver sequined maxi dress, gold clutch, silver patent strappy heels"
    ],
  },

  // =============================================================================
  // ROCK (30 мужских + 30 женских)
  // =============================================================================
  rock: {
    male: [
      "black leather jacket, white band t-shirt, ripped black jeans, black combat boots",
      "brown studded leather jacket, black graphic tee, dark blue ripped jeans, brown boots",
      "black denim vest, gray tank top, black skinny jeans, studded belt, black boots",
      "distressed leather jacket, black band tee, charcoal ripped jeans, silver chains, black boots",
      "black biker jacket, white skull t-shirt, torn black denim, leather bracelets, combat boots",
      "brown leather jacket with patches, black graphic tee, dark ripped jeans, brown boots",
      "black studded vest, gray band tank, black skinny jeans, chain accessories, black boots",
      "worn leather jacket, white band t-shirt, distressed blue jeans, black combat boots",
      "black moto jacket, dark gray tee, ripped black jeans, studded belt, black boots",
      "brown distressed leather jacket, black graphic tank, torn dark jeans, brown boots",
      "black leather jacket, white skeleton tee, black ripped skinny jeans, chain necklace, black boots",
      "studded black vest, gray band t-shirt, distressed jeans, leather cuffs, combat boots",
      "brown biker jacket, black graphic tee, dark blue torn jeans, brown studded boots",
      "black leather jacket with zippers, white band tank, ripped black denim, black boots",
      "charcoal studded jacket, black tee, distressed skinny jeans, silver chains, black boots",
      "black denim vest, gray graphic tank, torn black jeans, leather belt, combat boots",
      "brown leather moto jacket, white band t-shirt, ripped dark jeans, brown boots",
      "black biker jacket, dark gray skull tee, black distressed denim, studded accessories, black boots",
      "worn leather jacket, black graphic tank, torn blue jeans, chain necklace, combat boots",
      "black studded leather jacket, white band tee, ripped black jeans, black boots",
      "brown distressed vest, gray graphic t-shirt, dark torn denim, leather bracelets, brown boots",
      "black moto jacket, white skeleton tank, distressed black jeans, silver chains, black boots",
      "studded leather vest, black band tee, ripped skinny jeans, black combat boots",
      "brown biker jacket, dark gray graphic tee, torn jeans, studded belt, brown boots",
      "black leather jacket, white band tank, black distressed denim, chain accessories, black boots",
      "charcoal studded jacket, gray tee, ripped dark jeans, leather cuffs, combat boots",
      "black denim jacket, white graphic tank, torn black jeans, silver jewelry, black boots",
      "brown leather moto jacket, black band t-shirt, distressed blue jeans, brown boots",
      "black biker jacket with studs, gray skull tee, ripped black denim, chain necklace, black boots",
      "worn black leather jacket, white graphic tee, torn skinny jeans, studded belt, combat boots"
    ],
    female: [
      "black leather moto jacket, white band tee, ripped black skinny jeans, black combat boots",
      "brown studded leather jacket, black graphic tank top, dark blue distressed jeans, brown boots",
      "black leather vest, gray band crop top, ripped black jeans, studded belt, black boots",
      "distressed leather jacket, white skull tee, torn black denim, silver chains, combat boots",
      "black biker jacket, dark gray graphic crop top, ripped skinny jeans, leather bracelets, black boots",
      "brown leather jacket with patches, black band tank, torn dark jeans, brown combat boots",
      "black studded vest, white graphic tee, distressed black jeans, chain accessories, black boots",
      "worn leather moto jacket, gray band crop top, ripped blue jeans, black boots",
      "black leather jacket, white skeleton tank, torn black skinny jeans, studded belt, combat boots",
      "brown distressed leather jacket, black graphic crop tee, ripped dark jeans, brown boots",
      "black biker jacket, dark gray band tank, distressed black jeans, chain necklace, black boots",
      "studded black leather vest, white graphic tee, ripped skinny jeans, leather cuffs, combat boots",
      "brown moto jacket, black band crop top, torn blue jeans, brown studded boots",
      "black leather jacket with zippers, gray graphic tank, ripped black denim, black boots",
      "charcoal studded jacket, white band tee, distressed skinny jeans, silver chains, black boots",
      "black leather vest, dark gray crop top, torn black jeans, leather belt, combat boots",
      "brown biker jacket, white graphic tank, ripped dark jeans, brown boots",
      "black moto jacket, gray skull crop tee, distressed black denim, studded accessories, black boots",
      "worn leather jacket, black band tank, torn blue jeans, chain necklace, combat boots",
      "black studded leather jacket, white graphic tee, ripped black jeans, black boots",
      "brown distressed vest, gray band crop top, torn dark denim, leather bracelets, brown boots",
      "black leather moto jacket, white skeleton tank, distressed black jeans, silver chains, black boots",
      "studded leather vest, black graphic crop tee, ripped skinny jeans, black combat boots",
      "brown biker jacket, dark gray band tank, torn jeans, studded belt, brown boots",
      "black leather jacket, white graphic crop top, distressed black denim, chain accessories, black boots",
      "charcoal studded moto jacket, gray band tee, ripped dark jeans, leather cuffs, combat boots",
      "black denim vest, white graphic tank, torn black jeans, silver jewelry, black boots",
      "brown leather jacket, black band crop top, distressed blue jeans, brown combat boots",
      "black biker jacket with studs, gray skull tank, ripped black denim, chain necklace, black boots",
      "worn black leather moto jacket, white graphic tee, torn skinny jeans, studded belt, combat boots"
    ],
  },

  // =============================================================================
  // RESORT (30 мужских + 30 женских)
  // =============================================================================
  resort: {
    male: [
      "white linen shirt, beige linen shorts, brown leather sandals",
      "cream cotton button-up, khaki shorts, tan leather boat shoes",
      "light blue linen shirt, white shorts, beige espadrilles",
      "ivory short-sleeve shirt, sand-colored linen pants, brown leather sandals",
      "white cotton polo, beige shorts, tan suede loafers",
      "cream linen button-up, white linen pants, brown leather sandals",
      "light beige shirt, khaki shorts, natural straw hat, tan boat shoes",
      "white short-sleeve linen shirt, cream shorts, beige leather sandals",
      "ivory cotton polo, white linen pants, brown espadrilles",
      "soft blue linen shirt, beige shorts, tan leather sandals",
      "cream button-up, white shorts, natural hat, brown boat shoes",
      "white linen polo, khaki linen pants, beige leather sandals",
      "light beige short-sleeve shirt, cream shorts, tan suede loafers",
      "ivory linen button-up, white shorts, brown leather sandals",
      "soft cream cotton shirt, beige linen pants, straw hat, tan espadrilles",
      "white polo, sand-colored shorts, brown boat shoes",
      "light blue linen shirt, white linen pants, beige leather sandals",
      "cream short-sleeve shirt, khaki shorts, natural hat, tan sandals",
      "ivory button-up, beige shorts, brown suede loafers",
      "white cotton shirt, cream linen pants, tan leather boat shoes",
      "soft beige polo, white shorts, straw hat, beige espadrilles",
      "light cream linen shirt, khaki pants, brown leather sandals",
      "white short-sleeve button-up, beige shorts, tan boat shoes",
      "ivory linen polo, white linen pants, natural hat, brown sandals",
      "cream cotton shirt, sand-colored shorts, beige suede loafers",
      "white button-up, beige linen pants, tan leather sandals",
      "light blue polo, white shorts, straw hat, brown espadrilles",
      "soft cream short-sleeve shirt, khaki shorts, tan boat shoes",
      "ivory linen button-up, cream linen pants, beige leather sandals",
      "white cotton polo, beige shorts, natural hat, brown leather sandals"
    ],
    female: [
      "white linen maxi dress, natural straw hat, tan leather sandals",
      "cream cotton sundress, beige woven tote, brown flat sandals",
      "light blue flowy maxi dress, straw fedora, nude leather sandals",
      "ivory linen midi dress, beige sun hat, tan espadrille wedges",
      "white cotton off-shoulder dress, natural straw bag, brown leather sandals",
      "cream linen wrap dress, beige straw hat, tan flat sandals",
      "soft blue maxi dress, woven beach bag, nude leather sandals",
      "white linen shirt dress, natural fedora, beige espadrilles",
      "ivory cotton sundress, straw tote, tan leather flat sandals",
      "light beige linen maxi dress, cream sun hat, brown leather sandals",
      "white off-shoulder sundress, natural straw bag, tan espadrille wedges",
      "cream cotton maxi dress, beige fedora, nude flat sandals",
      "soft blue linen midi dress, straw beach bag, tan leather sandals",
      "ivory wrap dress, natural sun hat, beige espadrilles",
      "white linen maxi dress, woven tote, brown leather flat sandals",
      "light cream sundress, straw hat, tan leather sandals",
      "soft beige cotton dress, natural fedora, nude espadrille wedges",
      "white linen shirt dress, beige straw bag, tan flat sandals",
      "ivory off-shoulder maxi dress, cream sun hat, brown leather sandals",
      "light blue cotton sundress, natural straw tote, beige espadrilles",
      "cream linen midi dress, straw fedora, tan leather sandals",
      "white wrap dress, beige beach bag, nude flat sandals",
      "soft blue maxi dress, natural sun hat, tan leather espadrilles",
      "ivory linen sundress, woven straw bag, brown flat sandals",
      "light beige cotton maxi dress, cream fedora, tan leather sandals",
      "white linen off-shoulder dress, natural tote, beige espadrille wedges",
      "cream cotton midi dress, straw sun hat, nude leather sandals",
      "soft blue linen wrap dress, beige beach bag, tan flat sandals",
      "ivory maxi dress, natural straw fedora, brown leather espadrilles",
      "white sundress, cream woven bag, tan leather flat sandals"
    ],
  },

  // =============================================================================
  // VINTAGE-50S (30 мужских + 30 женских)
  // =============================================================================
  "vintage-50s": {
    male: [
      "navy blue suit with narrow lapels, white dress shirt, skinny black tie, brown oxford shoes",
      "charcoal gray suit, light blue shirt, black narrow tie, two-tone wingtip shoes",
      "brown tweed jacket, cream dress shirt, burgundy knit tie, brown leather loafers",
      "black suit, white shirt, thin black tie, black and white saddle shoes",
      "gray flannel suit, pale pink shirt, navy skinny tie, brown wingtip oxfords",
      "navy cardigan sweater, white button-down, gray flannel trousers, brown loafers",
      "charcoal suit with thin lapels, light blue shirt, black tie, two-tone brogues",
      "brown suit, cream shirt, burgundy narrow tie, brown oxford shoes",
      "black jacket, white dress shirt, gray flannel pants, thin black tie, saddle shoes",
      "gray suit, pale blue shirt, navy knit tie, brown wingtip loafers",
      "navy blazer, white button-down, khaki trousers, burgundy tie, brown oxfords",
      "charcoal cardigan, light blue shirt, gray pants, black narrow tie, two-tone shoes",
      "brown tweed suit, cream dress shirt, black skinny tie, brown leather brogues",
      "navy suit, white shirt, burgundy tie, black and white saddle oxfords",
      "gray flannel jacket, pale pink shirt, black knit tie, brown wingtip shoes",
      "black suit, light blue shirt, thin navy tie, two-tone oxford shoes",
      "brown cardigan, white button-down, gray trousers, burgundy tie, brown loafers",
      "charcoal suit, cream dress shirt, black narrow tie, brown wingtip brogues",
      "navy jacket, pale blue shirt, gray pants, black skinny tie, saddle shoes",
      "gray tweed suit, white shirt, burgundy knit tie, brown leather oxfords",
      "black blazer, light blue button-down, charcoal trousers, thin black tie, two-tone shoes",
      "brown suit, white dress shirt, navy narrow tie, brown wingtip loafers",
      "navy cardigan, cream shirt, khaki pants, burgundy tie, brown oxford shoes",
      "charcoal flannel suit, pale pink shirt, black tie, brown and white saddle brogues",
      "gray suit, light blue shirt, burgundy skinny tie, brown leather wingtip shoes",
      "black jacket, white button-down, gray trousers, navy knit tie, two-tone oxfords",
      "brown tweed blazer, cream dress shirt, black narrow tie, brown loafers",
      "navy suit, pale blue shirt, burgundy tie, black saddle shoes",
      "gray cardigan, white shirt, charcoal pants, black skinny tie, brown wingtip oxfords",
      "charcoal suit, light blue dress shirt, thin navy tie, two-tone brown and white shoes"
    ],
    female: [
      "red polka dot fit-and-flare dress with full skirt, white belt, red kitten heels",
      "navy blue swing dress, white peter pan collar, pearl necklace, nude pumps",
      "pink gingham halter dress with circle skirt, white cardigan, pink ballet flats",
      "black cocktail dress with sweetheart neckline, red belt, black kitten heels",
      "turquoise blue fit-and-flare dress, white pearl earrings, nude patent pumps",
      "red cherry print swing dress, white waist belt, red strappy kitten heels",
      "navy polka dot dress with full skirt, white collar, pearl bracelet, navy pumps",
      "pink floral halter dress, white bolero jacket, pink kitten heels",
      "black and white checkered dress, red belt, black patent leather pumps",
      "mint green swing dress, white pearls, nude kitten heels",
      "red fit-and-flare dress, white peter pan collar, pearl necklace, red ballet flats",
      "navy blue halter dress with circle skirt, white cardigan, nude patent pumps",
      "pink rose print dress, white waist belt, pearl earrings, pink kitten heels",
      "black cocktail dress with cap sleeves, red accessories, black pumps",
      "turquoise polka dot swing dress, white collar, pearl necklace, turquoise heels",
      "red gingham fit-and-flare dress, white belt, red patent kitten heels",
      "navy cherry print dress, white cardigan, pearl bracelet, navy ballet flats",
      "pink halter swing dress with full skirt, white accessories, nude pumps",
      "black and white striped dress, red waist belt, black kitten heels",
      "mint polka dot fit-and-flare dress, white collar, pearl earrings, nude patent heels",
      "red cocktail dress with sweetheart neckline, white pearls, red pumps",
      "navy blue floral halter dress, white belt, pearl necklace, navy kitten heels",
      "pink swing dress with peter pan collar, white cardigan, pink ballet flats",
      "black fit-and-flare dress, red polka dots, white accessories, black patent pumps",
      "turquoise gingham dress with circle skirt, white pearls, turquoise kitten heels",
      "red halter dress, white waist belt, pearl earrings, red strappy heels",
      "navy checkered swing dress, white collar, pearl bracelet, nude pumps",
      "pink cherry print fit-and-flare dress, white cardigan, pink kitten heels",
      "black cocktail dress, red belt, white pearls, black patent leather pumps",
      "mint green halter dress with full skirt, white accessories, nude kitten heels"
    ],
  },

  // =============================================================================
  // TRENDS-2026 (30 мужских + 30 женских)
  // =============================================================================
  "trends-2026": {
    male: [
      "metallic silver oversized puffer jacket, black tech-fabric pants, futuristic sneakers",
      "holographic iridescent bomber, white turtleneck, gray tailored pants, minimalist sneakers",
      "black asymmetric cut jacket, gray tech-wear shirt, cargo pants with straps, platform shoes",
      "chrome silver vest, white compression top, black utility pants, metallic sneakers",
      "navy blue holographic coat, black turtleneck, dark tech pants, futuristic boots",
      "metallic gold oversized hoodie, gray joggers, white platform sneakers",
      "iridescent purple jacket, black fitted top, utility cargo pants, silver sneakers",
      "silver tech-fabric blazer, white shirt, black tapered pants, chrome sneakers",
      "holographic blue puffer vest, gray turtleneck, navy tech pants, metallic boots",
      "black asymmetric bomber, white compression shirt, cargo pants, futuristic platforms",
      "chrome metallic oversized coat, black top, gray utility pants, silver sneakers",
      "navy iridescent jacket, white turtleneck, dark tech-wear pants, holographic shoes",
      "metallic silver hoodie, black joggers, white futuristic sneakers",
      "purple holographic vest, gray fitted shirt, black cargo pants, chrome boots",
      "iridescent blue blazer, white compression top, navy utility pants, silver platforms",
      "black metallic puffer, gray turtleneck, dark tech pants, futuristic sneakers",
      "chrome gold jacket, white shirt, black tapered pants, metallic sneakers",
      "holographic silver bomber, black top, gray cargo pants, chrome platforms",
      "navy metallic oversized coat, white turtleneck, utility pants, silver boots",
      "iridescent purple puffer vest, gray shirt, black tech pants, futuristic sneakers",
      "metallic blue jacket, white compression top, navy joggers, holographic shoes",
      "chrome silver blazer, black turtleneck, gray utility pants, silver platforms",
      "holographic gold oversized hoodie, white top, dark cargo pants, metallic sneakers",
      "iridescent navy coat, gray shirt, black tech-wear pants, futuristic boots",
      "metallic purple vest, white fitted top, gray utility pants, chrome sneakers",
      "silver holographic bomber, black turtleneck, navy tapered pants, silver platforms",
      "chrome blue puffer jacket, white shirt, gray cargo pants, futuristic sneakers",
      "iridescent gold blazer, black compression top, dark utility pants, metallic boots",
      "holographic silver coat, gray turtleneck, black tech pants, chrome platforms",
      "metallic navy oversized jacket, white top, gray joggers, silver futuristic sneakers"
    ],
    female: [
      "metallic silver asymmetric dress, holographic accessories, chrome platform heels",
      "iridescent purple bodycon dress with cut-outs, silver clutch, futuristic heels",
      "chrome gold mini dress, black metallic tights, silver ankle boots",
      "holographic blue wrap dress, clear accessories, iridescent platform pumps",
      "black tech-fabric dress with neon accents, metallic belt, chrome heeled boots",
      "navy iridescent maxi dress with high slit, silver jewelry, holographic heels",
      "metallic pink asymmetric top, chrome silver skirt, futuristic platform sandals",
      "holographic silver bodycon dress, iridescent clutch, chrome ankle strap heels",
      "iridescent gold mini dress, black accessories, metallic platform pumps",
      "chrome blue asymmetric dress, silver jewelry, holographic heeled boots",
      "metallic purple wrap dress with tech details, iridescent clutch, silver platforms",
      "holographic navy maxi dress, chrome accessories, futuristic heels",
      "silver metallic crop top, iridescent midi skirt, clear platform sandals",
      "iridescent pink bodycon dress, holographic jewelry, chrome pumps",
      "black asymmetric dress with metallic panels, silver clutch, futuristic ankle boots",
      "chrome gold wrap dress, iridescent accessories, metallic platform heels",
      "holographic blue mini dress, silver jewelry, chrome heeled sandals",
      "metallic navy bodycon dress with cut-outs, iridescent clutch, silver platforms",
      "iridescent purple asymmetric dress, holographic accessories, chrome pumps",
      "silver metallic maxi dress with high slit, chrome jewelry, futuristic heels",
      "holographic pink wrap dress, iridescent clutch, metallic platform boots",
      "chrome blue bodycon dress, silver accessories, holographic ankle strap heels",
      "iridescent gold asymmetric top, black metallic skirt, chrome platform sandals",
      "metallic purple mini dress, holographic jewelry, silver futuristic pumps",
      "holographic navy dress with tech details, iridescent clutch, chrome heels",
      "silver metallic wrap dress, holographic accessories, metallic platform pumps",
      "iridescent blue bodycon dress, chrome jewelry, futuristic heeled boots",
      "metallic gold asymmetric maxi dress, silver clutch, holographic platforms",
      "chrome pink mini dress, iridescent accessories, metallic ankle strap heels",
      "holographic silver bodycon dress, chrome jewelry, futuristic platform pumps"
    ],
  },
};

/**
 * Универсальная функция для получения случайного образа для любого стиля
 */
function getRandomOutfitForStyle(style: string, gender?: string): string {
  const outfits = styleOutfits[style];

  if (!outfits) {
    // Если стиль не найден, используем fallback
    return "tailored outfit suitable for the style";
  }

  if (gender === "MALE") {
    return outfits.male[Math.floor(Math.random() * outfits.male.length)];
  } else if (gender === "FEMALE") {
    return outfits.female[Math.floor(Math.random() * outfits.female.length)];
  }

  // По умолчанию используем мужской массив
  return outfits.male[Math.floor(Math.random() * outfits.male.length)];
}

// Данные локаций: освещение и описание фона
interface LocationData {
  lighting: string;
  background: string;
}

const locationData: Record<string, LocationData> = {
  "city-day": {
    lighting: "natural golden sunlight with soft shadows",
    background: "modern city street with skyscrapers, blurred urban backdrop"
  },
  "city-night": {
    lighting: "neon glow and street lamp illumination",
    background: "nighttime city street with neon signs, wet asphalt reflections, cinematic bokeh"
  },
  "runway": {
    lighting: "dramatic spotlights from above",
    background: "fashion show runway with white catwalk, blurred audience in darkness"
  },
  "beach": {
    lighting: "warm golden hour sunset light",
    background: "tropical beach with turquoise ocean, golden sand, palm trees silhouettes"
  },
  "cafe": {
    lighting: "warm Edison bulb ambient lighting",
    background: "elegant Parisian cafe interior with marble table, large window, soft bokeh"
  },
  "nature": {
    lighting: "dappled sunlight through leaves, golden hour",
    background: "lush green park with tall trees, natural scenery"
  },
  "loft": {
    lighting: "large window natural light with soft industrial shadows",
    background: "industrial loft with exposed brick walls, steel-frame windows, polished concrete floor"
  },
};

// 5 студийных фонов для случайного выбора
const studioBackgrounds: string[] = [
  "Warm light lavender gradient backdrop with soft directional lighting",
  "Warm beige-cream gradient backdrop with diffused lighting",
  "Soft ivory backdrop with natural window lighting",
  "Warm powder pink gradient backdrop with soft directional lighting",
  "Warm light olive gradient backdrop with soft directional lighting"
];

function getRandomStudioBackground(): string {
  return studioBackgrounds[Math.floor(Math.random() * studioBackgrounds.length)];
}

// Цветовые палитры
const paletteDescriptions: Record<string, string> = {
  "spring": "soft blush pink, warm peach, light lavender, pale yellow",
  "summer": "sky blue, soft rose pink, light gray, cool lavender",
  "autumn": "burnt terracotta, chocolate brown, mustard yellow, chestnut",
  "winter": "jet black, crisp white, navy blue, crimson red",
  "classic-neutrals": "warm beige, soft cream, taupe, charcoal gray",
  "nature-earth": "brown, olive green, terracotta, khaki",
  "soft-pastels": "baby pink, lavender, powder blue, peach",
  "rich-bold": "burgundy, navy blue, dark slate, black",
};

// =============================================================================
// ФУНКЦИИ ПОСТРОЕНИЯ ПРОМПТОВ (4 шаблона)
// =============================================================================

/**
 * Получает описание одежды для стиля
 * Использует универсальную систему getRandomOutfitForStyle для всех стилей
 */
function getClothingForStyle(style: string, gender?: string): string {
  return getRandomOutfitForStyle(style, gender);
}

/**
 * Шаблон 1: Только стиль (студийный фон)
 */
function buildPromptStyleOnly(style: string, gender?: string): string {
  const clothing = getClothingForStyle(style, gender);
  const studio = getRandomStudioBackground();
  const genderContext = gender ? ` Outfit suitable for ${gender.toLowerCase()}.` : "";

  return `Change outfit to ${style} style: ${clothing}.${genderContext} Background: ${studio}, keep face unchanged`;
}

/**
 * Шаблон 2: Стиль + Локация
 */
function buildPromptStyleLocation(style: string, location: string, gender?: string): string {
  const clothing = getClothingForStyle(style, gender);
  const loc = locationData[location];

  if (!loc) return buildPromptStyleOnly(style, gender);

  const genderContext = gender ? ` Outfit suitable for ${gender.toLowerCase()}.` : "";

  return `Change outfit to ${style} style: ${clothing}.${genderContext} Background: ${loc.background}, keep face unchanged`;
}

/**
 * Шаблон 3: Стиль + Палитра (без локации)
 */
function buildPromptStylePalette(style: string, palette: string, gender?: string): string {
  const clothing = getClothingForStyle(style, gender);
  const colors = paletteDescriptions[palette] || "";
  const studio = getRandomStudioBackground();
  const genderContext = gender ? ` Outfit suitable for ${gender.toLowerCase()}.` : "";

  return `Change outfit to ${style} style: ${clothing} in ${colors}.${genderContext} Background: ${studio}, keep face unchanged`;
}

/**
 * Шаблон 4: Стиль + Локация + Палитра
 */
function buildPromptFull(style: string, location: string, palette: string, gender?: string): string {
  const clothing = getClothingForStyle(style, gender);
  const colors = paletteDescriptions[palette] || "";
  const loc = locationData[location];

  if (!loc) return buildPromptStylePalette(style, palette, gender);

  const genderContext = gender ? ` Outfit suitable for ${gender.toLowerCase()}.` : "";

  return `Change outfit to ${style} style: ${clothing} in ${colors}.${genderContext} Background: ${loc.background}, keep face unchanged`;
}

/**
 * Шаблон 5: Пользовательское описание одежды
 */
function buildPromptCustom(customOutfit: string, location?: string, palette?: string, gender?: string): string {
  const hasLocation = location && location !== "studio";
  const hasPalette = !!palette;

  let prompt = `Wear ${customOutfit}.`;

  // Добавляем цвета если есть палитра
  if (hasPalette) {
    const colors = paletteDescriptions[palette!] || "";
    if (colors) {
      prompt += ` Colors: ${colors}.`;
    }
  }

  // Добавляем фон (локация или студия)
  if (hasLocation) {
    const loc = locationData[location!];
    if (loc) {
      prompt += ` Background: ${loc.background},`;
    }
  } else {
    const studio = getRandomStudioBackground();
    prompt += ` Background: ${studio},`;
  }

  prompt += ` keep face unchanged`;

  return prompt;
}

/**
 * Главная функция выбора шаблона
 */
function buildPrompt(style: string, location?: string, palette?: string, customOutfit?: string, gender?: string): string {
  // Шаблон 5: Пользовательское описание одежды (приоритет)
  if (customOutfit) {
    console.log("Template 5: Custom outfit text", gender ? `(gender: ${gender})` : "");
    return buildPromptCustom(customOutfit, location, palette, gender);
  }

  const hasLocation = location && location !== "studio";
  const hasPalette = !!palette;

  // Шаблон 4: Стиль + Локация + Палитра
  if (hasLocation && hasPalette) {
    console.log("Template 4: Style + Location + Palette", gender ? `(gender: ${gender})` : "");
    return buildPromptFull(style, location, palette, gender);
  }

  // Шаблон 3: Стиль + Палитра (без локации)
  if (hasPalette && !hasLocation) {
    console.log("Template 3: Style + Palette", gender ? `(gender: ${gender})` : "");
    return buildPromptStylePalette(style, palette, gender);
  }

  // Шаблон 2: Стиль + Локация (без палитры)
  if (hasLocation && !hasPalette) {
    console.log("Template 2: Style + Location", gender ? `(gender: ${gender})` : "");
    return buildPromptStyleLocation(style, location, gender);
  }

  // Шаблон 1: Только стиль
  console.log("Template 1: Style only", gender ? `(gender: ${gender})` : "");
  return buildPromptStyleOnly(style, gender);
}

// Premium функции (требуют подписку)
const premiumStyles = [
  "romantic", "minimalism", "boho", "grunge",
  "preppy", "disco", "ladylike", "scandinavian", "gaucho",
  "urban-chic", "evening-elegant", "glamour", "rock", "resort",
  "vintage-50s", "trends-2026"
];
const premiumLocations = ["city-night", "runway", "beach", "cafe", "nature", "loft"];
const premiumPalettes = ["spring", "summer", "autumn", "winter", "nature-earth", "soft-pastels", "rich-bold"];

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionType: true, bonusGenerations: true },
    });

    const subscriptionType = user?.subscriptionType || "FREE";
    const bonusGenerations = user?.bonusGenerations || 0;
    const monthlyLimit = MONTHLY_LIMITS[subscriptionType] + bonusGenerations;

    // Проверяем месячный лимит генераций
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyUsage = await prisma.dailyLimit.aggregate({
      where: {
        userId: session.user.id,
        date: { gte: monthStart },
      },
      _sum: { generationsCount: true },
    });

    const used = monthlyUsage._sum.generationsCount || 0;

    if (used >= monthlyLimit) {
      return NextResponse.json(
        {
          error: "Monthly limit reached",
          message: `Вы исчерпали месячный лимит (${monthlyLimit} генераций). ${subscriptionType === "FREE" ? "Оформите подписку Base или Premium для увеличения лимита." : subscriptionType === "BASE" ? "Перейдите на Premium для 100 генераций в месяц." : "Лимит обновится в следующем месяце."}`,
          limit: monthlyLimit,
          used,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { image, style, location, palette, gender, customOutfit } = body;

    // TODO: Вернуть позже
    // // Проверка Cloudflare Turnstile (защита от ботов)
    // if (turnstileToken) {
    //   const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    //   const isValid = await verifyTurnstileToken(turnstileToken, clientIp);
    //   if (!isValid) {
    //     return NextResponse.json(
    //       { error: "Captcha verification failed" },
    //       { status: 403 }
    //     );
    //   }
    // }

    // Валидация: либо style, либо customOutfit должны быть указаны
    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    if (!style && !customOutfit) {
      return NextResponse.json(
        { error: "Either style or customOutfit is required" },
        { status: 400 }
      );
    }

    // Валидация gender (опционально, для будущего использования)
    if (gender && !["MALE", "FEMALE"].includes(gender)) {
      return NextResponse.json(
        { error: "Invalid gender value" },
        { status: 400 }
      );
    }

    // Проверяем доступ к premium функциям
    const isPremium = subscriptionType !== "FREE";

    if (!isPremium) {
      // Проверяем стиль
      if (premiumStyles.includes(style)) {
        return NextResponse.json(
          {
            error: "Premium feature",
            message: `Стиль "${style}" доступен только для Premium подписки`,
          },
          { status: 403 }
        );
      }

      // Проверяем локацию
      if (location && premiumLocations.includes(location)) {
        return NextResponse.json(
          {
            error: "Premium feature",
            message: `Локация "${location}" доступна только для Premium подписки`,
          },
          { status: 403 }
        );
      }

      // Проверяем палитру
      if (palette && premiumPalettes.includes(palette)) {
        return NextResponse.json(
          {
            error: "Premium feature",
            message: `Цветовая палитра "${palette}" доступна только для Premium подписки`,
          },
          { status: 403 }
        );
      }
    }

    // Проверяем API токен
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("REPLICATE_API_TOKEN is not set!");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    console.log("Starting generation with Flux Kontext Pro...");
    console.log("Image size:", Math.round(image.length / 1024), "KB");

    if (customOutfit) {
      console.log("Custom outfit:", customOutfit, "| Location:", location || "studio (default)", "| Palette:", palette || "none");
    } else {
      console.log("Style:", style, "| Location:", location || "studio (default)", "| Palette:", palette || "none");
    }

    // Собираем промпт через систему из 5 шаблонов
    // Шаблон 1: Только стиль (студийный фон - случайный из 5)
    // Шаблон 2: Стиль + Локация (не studio)
    // Шаблон 3: Стиль + Палитра (без локации)
    // Шаблон 4: Стиль + Локация + Палитра
    // Шаблон 5: Пользовательское описание одежды (приоритет)
    const fullPrompt = buildPrompt(style || "", location, palette, customOutfit, gender);

    console.log("Generated prompt:", fullPrompt);

    // Flux Kontext Pro - редактирование с сохранением лица ($0.04/image)
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt: fullPrompt,
          input_image: image,
          aspect_ratio: "3:4",
          output_format: "jpg",
          safety_tolerance: 2,
          prompt_upsampling: false,
          // Критические параметры для сохранения лица:
          image_to_image_strength: 0.55, // 0.45-0.65: <0.4 мало изменений, >0.7 теряется лицо
          cfg_scale: 2.5,                // 2.0-3.0: выше 3.5 агрессивно перерисовывает
          num_inference_steps: 30,       // 28-35: баланс детализации и стабильности
        },
      }
    );

    console.log("Generation complete!");
    console.log("Output:", output);

    // Kontext возвращает URL напрямую или в массиве
    const replicateUrl = Array.isArray(output) ? output[0] : output;

    // Скачиваем изображение с Replicate (временный URL, истекает через ~1 час)
    const imgResponse = await fetch(String(replicateUrl));
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

    // Загружаем в Yandex Object Storage для постоянного хранения
    const imageKey = `generations/${session.user.id}/${Date.now()}.jpg`;
    let resultUrl: string;
    try {
      resultUrl = await uploadImage(imgBuffer, imageKey);
      console.log("Image uploaded to S3:", resultUrl);
    } catch (s3Error) {
      console.error("S3 upload error, falling back to base64:", s3Error);
      // Fallback: сохраняем как base64 если S3 недоступен
      resultUrl = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
    }

    // Водяной знак для FREE пользователей
    if (subscriptionType === "FREE") {
      try {
        const metadata = await sharp(imgBuffer).metadata();
        const width = metadata.width || 768;
        const height = metadata.height || 1024;
        const fontSize = Math.round(width * 0.04);

        const svgWatermark = `
          <svg width="${width}" height="${height}">
            <text
              x="${width / 2}" y="${height - fontSize * 1.5}"
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="${fontSize}"
              font-weight="bold"
              fill="white"
              opacity="0.5"
            >Looklike-me.ru</text>
          </svg>`;

        const watermarked = await sharp(imgBuffer)
          .composite([{ input: Buffer.from(svgWatermark), top: 0, left: 0 }])
          .jpeg({ quality: 90 })
          .toBuffer();

        // Водяной знак загружаем отдельным файлом
        const wmKey = `generations/${session.user.id}/${Date.now()}_wm.jpg`;
        try {
          resultUrl = await uploadImage(watermarked, wmKey);
        } catch {
          resultUrl = `data:image/jpeg;base64,${watermarked.toString("base64")}`;
        }
        console.log("Watermark applied for FREE user");
      } catch (wmError) {
        console.error("Watermark error:", wmError);
      }
    }

    // Обновляем счетчики пользователя
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.$transaction([
      // Увеличиваем общий счетчик генераций
      prisma.user.update({
        where: { id: session.user.id },
        data: { totalGenerations: { increment: 1 } },
      }),
      // Увеличиваем дневной лимит
      prisma.dailyLimit.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
        create: {
          userId: session.user.id,
          date: today,
          generationsCount: 1,
        },
        update: {
          generationsCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      imageUrl: resultUrl,
      prompt: fullPrompt,
    });
  } catch (error: unknown) {
    console.error("=== GENERATION ERROR ===");
    console.error("Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Generation failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
