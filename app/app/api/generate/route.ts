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
// СИСТЕМА ПРОМПТОВ (3 шаблона)
// Шаблон 1: Только стиль → студийный фон
// Шаблон 2: Стиль + Локация → кастомный фон
// Шаблон 3: Пользовательское описание одежды
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
      "blue jeans, white t-shirt, white sneakers",
      "terracotta wide pants, white t-shirt, tan loafers",
      "gray chinos, white polo, brown loafers",
      "brown turtleneck, cream pants, brown sandals",
      "black skinny jeans, gray hoodie, white sneakers",
      "emerald flared pants, white t-shirt, green sneakers",
      "white shirt, blue jeans, white sneakers",
      "peach polo, white chinos, peach sneakers",
      "gray cargo pants, black t-shirt, gray sneakers",
      "mint hoodie, cream pants, mint sneakers",
      "black chinos, white polo, black loafers",
      "ochre shirt, terracotta pants, ochre moccasins",
      "beige shorts, white t-shirt, beige sandals",
      "lavender t-shirt, beige flared pants, lavender loafers",
      "blue jeans, gray t-shirt, white sneakers",
      "brown cardigan, white t-shirt, beige pants, sandals",
      "white chinos, light blue polo, white loafers",
      "cream shirt, white pants, cream loafers",
      "black jeans, white hoodie, black sneakers",
      "emerald t-shirt, white wide pants, green sneakers",
      "gray turtleneck, black chinos, gray loafers",
      "terracotta hoodie, beige pants, terracotta sneakers",
      "blue ripped jeans, white tank top, blue sneakers",
      "peach blazer, white tank, cream pants, sandals",
      "white t-shirt, black flared pants, white sneakers",
      "mint polo, white chinos, mint loafers",
      "olive cargo pants, white t-shirt, olive sneakers",
      "ochre turtleneck, brown pants, ochre loafers",
      "black t-shirt, gray skinny jeans, black sneakers",
      "lavender cardigan, white t-shirt, beige pants, sandals"
    ],
    female: [
      "blue skinny jeans, white t-shirt, white sneakers",
      "terracotta wide pants, white t-shirt, tan loafers",
      "white shirt, flared jeans, white sneakers",
      "brown turtleneck, cream wide pants, brown loafers",
      "gray leggings, black hoodie, gray sneakers",
      "emerald blouse, white flared pants, green flats",
      "black jeans, white tank top, black sneakers",
      "peach turtleneck, cream pants, peach flats",
      "beige chinos, white polo, beige loafers",
      "mint blouse, white pants, mint sandals",
      "blue ripped jeans, gray t-shirt, white sneakers",
      "ochre midi dress, ochre sandals",
      "white shirt dress, denim jacket, white sneakers",
      "lavender blouse, beige flared pants, lavender loafers",
      "gray skinny jeans, black hoodie, gray sneakers",
      "brown cardigan, white tank, cream pants, sandals",
      "black chinos, white polo, black flats",
      "cream midi dress, cream flats",
      "white t-shirt, black flared pants, white sneakers",
      "emerald turtleneck, white wide pants, green flats",
      "gray turtleneck, white pants, gray flats",
      "terracotta cardigan, white tank, beige pants, sandals",
      "blue jeans, pink t-shirt, white sneakers",
      "peach maxi dress, peach sandals",
      "beige shorts, white t-shirt, beige sandals",
      "mint blouse, cream flared pants, mint loafers",
      "olive cargo pants, white tank top, olive sneakers",
      "ochre turtleneck, terracotta pants, ochre sandals",
      "black t-shirt, gray jeans, black sneakers",
      "lavender midi dress, lavender flats"
    ],
  },

  // =============================================================================
  // BUSINESS (30 мужских + 30 женских)
  // =============================================================================
  business: {
    male: [
      "charcoal suit, white shirt, black oxfords",
      "navy suit, light blue shirt, brown brogues",
      "beige suit, white polo, brown loafers",
      "dark gray suit, gray shirt, black monk straps",
      "navy pinstripe suit, white shirt, burgundy oxfords",
      "charcoal suit, pink shirt, black chelsea boots",
      "dark blue suit, white turtleneck, brown derbies",
      "olive suit, beige shirt, brown loafers",
      "light gray suit, white shirt, navy loafers",
      "black suit, white shirt, black patent oxfords",
      "terracotta suit, cream shirt, brown brogues",
      "navy suit, light blue shirt, black oxfords",
      "beige suit, white polo, tan loafers",
      "dark gray double-breasted suit, white shirt, oxfords",
      "charcoal suit, burgundy shirt, black derbies",
      "navy pinstripe suit, blue shirt, brown oxfords",
      "light gray suit, white turtleneck, gray boots",
      "olive suit, white shirt, brown brogues",
      "dark blue suit, cream shirt, navy loafers",
      "black suit, gray shirt, black oxfords",
      "terracotta suit, white shirt, brown loafers",
      "navy suit, white polo, black brogues",
      "beige suit, light blue shirt, tan loafers",
      "charcoal suit, white turtleneck, black boots",
      "dark gray suit, pink shirt, burgundy oxfords",
      "navy suit, white shirt, brown monk straps",
      "light gray suit, beige polo, gray loafers",
      "olive suit, white shirt, brown derbies",
      "dark blue pinstripe suit, blue shirt, oxfords",
      "black double-breasted suit, white shirt, oxfords"
    ],
    female: [
      "charcoal pantsuit, white blouse, black pumps",
      "navy blazer, white blouse, navy pants, nude pumps",
      "beige suit, cream top, beige heels",
      "gray blazer, gray blouse, pencil skirt, black pumps",
      "navy pinstripe pantsuit, white blouse, flats",
      "charcoal blazer, pink blouse, gray pants, boots",
      "dark blue blazer, white turtleneck, navy pants",
      "olive blazer, beige top, olive culottes, flats",
      "light gray blazer, white blouse, gray skirt, pumps",
      "black pantsuit, white blouse, black pumps",
      "terracotta blazer, cream blouse, wide pants, heels",
      "navy blazer, blue blouse, pencil skirt, pumps",
      "beige pantsuit, white camisole, tan loafers",
      "gray double-breasted blazer, white blouse, pants",
      "charcoal blazer, burgundy blouse, black skirt, pumps",
      "navy blazer, blue blouse, culottes, flats",
      "light gray blazer, white turtleneck, gray pants",
      "olive blazer, white blouse, olive skirt, pumps",
      "dark blue jacket, cream blouse, navy pants",
      "black blazer, gray top, pencil skirt, pumps",
      "terracotta blazer, white camisole, beige pants",
      "navy pantsuit, white blouse, black pumps",
      "beige blazer, blue top, beige culottes, heels",
      "charcoal blazer, white turtleneck, gray pants",
      "gray blazer, pink blouse, gray skirt, flats",
      "navy blazer, white blouse, wide pants, loafers",
      "light gray blazer, beige camisole, pencil skirt",
      "olive blazer, white blouse, olive pants, flats",
      "navy pinstripe blazer, blue top, culottes, pumps",
      "black double-breasted pantsuit, white blouse, pumps"
    ],
  },

  // =============================================================================
  // SPORT (30 мужских + 30 женских)
  // =============================================================================
  sport: {
    male: [
      "black joggers, gray t-shirt, black running shoes",
      "navy track pants, white shirt, navy sneakers",
      "charcoal sweatpants, black tank top, gray trainers",
      "green shorts, white t-shirt, green running shoes",
      "black leggings, gray long-sleeve top, black shoes",
      "navy joggers, blue shirt, navy trainers",
      "gray pants, black tee, white running shoes",
      "olive track pants, beige shirt, olive sneakers",
      "black shorts, white tank top, black trainers",
      "charcoal sweatpants, navy top, gray shoes",
      "blue joggers, white tee, blue running shoes",
      "black track pants, gray shirt, black trainers",
      "navy shorts, white tank, navy trainers",
      "gray leggings, black long-sleeve, gray sneakers",
      "olive joggers, white tee, olive shoes",
      "black sweatpants, charcoal tank, black shoes",
      "navy track pants, gray shirt, navy trainers",
      "green pants, white top, green sneakers",
      "black shorts, gray tee, black trainers",
      "charcoal joggers, white shirt, gray shoes",
      "navy sweatpants, black tank, navy shoes",
      "gray track pants, white shirt, gray trainers",
      "olive shorts, beige top, olive sneakers",
      "black joggers, gray long-sleeve, black shoes",
      "blue sweatpants, white tee, blue trainers",
      "charcoal track pants, black shirt, gray trainers",
      "navy leggings, white tank, navy sneakers",
      "green joggers, white tee, green running shoes",
      "black pants, gray top, black trainers",
      "navy shorts, white shirt, navy shoes"
    ],
    female: [
      "black leggings, gray sports bra, black shoes",
      "navy leggings, white tank top, navy sneakers",
      "charcoal leggings, black sports bra, gray trainers",
      "green tights, white crop top, green shoes",
      "black leggings, gray crop top, black shoes",
      "navy leggings, blue sports bra, navy trainers",
      "gray tights, black crop tank, white shoes",
      "olive leggings, beige sports bra, olive sneakers",
      "black bike shorts, white crop tee, black trainers",
      "charcoal leggings, navy tank top, gray shoes",
      "blue tights, white sports bra, blue shoes",
      "black leggings, gray crop top, black trainers",
      "navy tights, white crop tank, navy trainers",
      "gray leggings, black bra top, gray sneakers",
      "olive leggings, white crop top, olive shoes",
      "black tights, charcoal sports bra, black shoes",
      "navy leggings, gray crop top, navy trainers",
      "green leggings, white long-sleeve, green sneakers",
      "black bike shorts, gray sports bra, black trainers",
      "charcoal leggings, white tank, gray shoes",
      "navy tights, black crop top, navy shoes",
      "gray leggings, white sports bra, gray trainers",
      "olive tights, beige tank, olive sneakers",
      "black leggings, gray crop top, black shoes",
      "blue leggings, white long-sleeve top, blue trainers",
      "charcoal tights, black bra top, gray trainers",
      "navy leggings, white crop tank, navy sneakers",
      "green leggings, white sports bra, green shoes",
      "black leggings, gray crop top, black trainers",
      "navy tights, white tank top, navy shoes"
    ],
  },

  // =============================================================================
  // STREET (30 мужских + 30 женских)
  // =============================================================================
  street: {
    male: [
      "black oversized hoodie, gray cargo pants, white sneakers",
      "navy graphic hoodie, black baggy jeans, platform sneakers",
      "charcoal sweatshirt, olive cargo pants, gray trainers",
      "white oversized tee, black wide pants, white sneakers",
      "olive hoodie, beige cargo pants, olive sneakers",
      "black graphic tee, gray parachute pants, sneakers",
      "navy zip hoodie, black cargo joggers, trainers",
      "gray crewneck, olive wide pants, gray sneakers",
      "white hoodie, black cargo pants, white sneakers",
      "charcoal graphic sweatshirt, navy jeans, trainers",
      "black oversized tee, beige cargo pants, sneakers",
      "olive hoodie, gray parachute pants, trainers",
      "navy graphic tee, black cargo pants, sneakers",
      "gray zip hoodie, charcoal baggy pants, sneakers",
      "white sweatshirt, black cargo joggers, trainers",
      "black hoodie, olive cargo pants, platform sneakers",
      "navy oversized tee, gray parachute pants, sneakers",
      "charcoal graphic hoodie, black jeans, trainers",
      "olive crewneck, beige cargo pants, sneakers",
      "white graphic tee, black wide pants, trainers",
      "black zip hoodie, navy cargo pants, sneakers",
      "gray oversized tee, olive parachute pants, sneakers",
      "navy hoodie, black cargo joggers, trainers",
      "charcoal sweatshirt, gray baggy pants, sneakers",
      "white oversized hoodie, black cargo pants, trainers",
      "olive graphic tee, beige wide pants, sneakers",
      "black crewneck, navy parachute pants, sneakers",
      "gray hoodie, charcoal cargo pants, trainers",
      "navy oversized tee, black jeans, platform sneakers",
      "white graphic hoodie, gray cargo pants, trainers"
    ],
    female: [
      "black oversized hoodie, gray cargo pants, white sneakers",
      "navy cropped hoodie, black baggy jeans, sneakers",
      "charcoal sweatshirt, olive cargo pants, trainers",
      "white oversized tee, black wide pants, sneakers",
      "olive cropped hoodie, beige cargo pants, sneakers",
      "black graphic tee, gray parachute pants, sneakers",
      "navy zip hoodie, black cargo joggers, trainers",
      "gray cropped sweatshirt, olive wide pants, sneakers",
      "white hoodie, black cargo pants, sneakers",
      "charcoal crop top, navy baggy jeans, trainers",
      "black oversized tee, beige cargo pants, sneakers",
      "olive hoodie, gray parachute pants, trainers",
      "navy graphic crop top, black cargo pants, sneakers",
      "gray zip hoodie, charcoal baggy pants, sneakers",
      "white cropped sweatshirt, black joggers, sneakers",
      "black hoodie, olive cargo pants, trainers",
      "navy oversized tee, gray parachute pants, sneakers",
      "charcoal graphic hoodie, black jeans, trainers",
      "olive cropped crewneck, beige cargo pants, sneakers",
      "white graphic tee, black wide pants, trainers",
      "black zip hoodie, navy cargo pants, sneakers",
      "gray crop top, olive parachute pants, sneakers",
      "navy hoodie, black cargo joggers, trainers",
      "charcoal sweatshirt, gray baggy pants, sneakers",
      "white oversized hoodie, black cargo pants, sneakers",
      "olive graphic crop tee, beige wide pants, trainers",
      "black cropped sweatshirt, navy pants, sneakers",
      "gray hoodie, charcoal cargo pants, trainers",
      "navy oversized tee, black jeans, sneakers",
      "white graphic hoodie, gray cargo pants, trainers"
    ],
  },

  // =============================================================================
  // ROMANTIC (30 мужских + 30 женских)
  // =============================================================================
  romantic: {
    male: [
      "cream shirt, beige chinos, brown loafers",
      "soft pink shirt, white pants, tan loafers",
      "light blue button-up, cream trousers, boat shoes",
      "lavender shirt, beige pants, tan sandals",
      "ivory shirt, white pants, cream loafers",
      "blush pink shirt, cream chinos, brown loafers",
      "soft blue shirt, beige trousers, tan moccasins",
      "cream textured shirt, white pants, brown sandals",
      "pale pink button-up, ivory chinos, loafers",
      "lavender shirt, cream pants, tan loafers",
      "soft cream shirt, beige trousers, boat shoes",
      "blush shirt, white pants, cream loafers",
      "pale blue button-up, cream chinos, tan sandals",
      "ivory shirt, beige trousers, brown moccasins",
      "soft pink shirt, white pants, cream loafers",
      "light blue shirt, cream trousers, tan loafers",
      "lavender button-up, beige chinos, brown sandals",
      "cream shirt, white pants, tan loafers",
      "blush pink shirt, ivory trousers, boat shoes",
      "soft blue shirt, cream pants, brown loafers",
      "pale pink shirt, beige trousers, cream sandals",
      "lavender shirt, white chinos, tan moccasins",
      "ivory button-up, cream pants, brown loafers",
      "soft cream shirt, beige trousers, tan sandals",
      "blush shirt, white pants, cream loafers",
      "pale blue shirt, cream chinos, beige loafers",
      "light pink shirt, ivory trousers, boat shoes",
      "soft lavender shirt, beige pants, tan sandals",
      "cream button-up, white trousers, moccasins",
      "pale pink shirt, cream chinos, tan loafers"
    ],
    female: [
      "cream floral midi dress, nude heeled sandals",
      "soft pink maxi dress, tan strappy heels",
      "light blue floral wrap dress, cream flats",
      "lavender lace midi dress, beige pumps",
      "ivory slip dress with lace, cream sandals",
      "blush pink flowy maxi dress, tan heels",
      "soft blue embroidered midi dress, nude flats",
      "cream lace fit-and-flare dress, heels",
      "pale pink wrap dress, beige sandals",
      "lavender midi dress, cream pumps",
      "soft cream floral maxi dress, tan sandals",
      "blush lace cocktail dress, nude heels",
      "pale blue slip dress, cream flats",
      "ivory midi dress with ruffles, beige heels",
      "soft pink embroidered maxi dress, tan flats",
      "light blue lace wrap dress, cream pumps",
      "lavender floral midi dress, nude sandals",
      "cream maxi dress, brown heels",
      "blush pink fit-and-flare dress, beige heels",
      "soft blue lace midi dress, tan flats",
      "pale pink wrap dress, cream heels",
      "lavender embroidered dress, nude pumps",
      "ivory floral maxi dress, beige sandals",
      "soft cream midi dress, tan heels",
      "blush slip dress with lace, cream flats",
      "pale blue lace cocktail dress, nude heels",
      "light pink flowy maxi dress, beige flats",
      "soft lavender wrap dress, tan pumps",
      "cream embroidered midi dress, brown sandals",
      "pale pink maxi dress, nude heels"
    ],
  },

  // =============================================================================
  // MINIMALISM (30 мужских + 30 женских)
  // =============================================================================
  minimalism: {
    male: [
      "white t-shirt, beige pants, white sneakers",
      "cream sweater, gray trousers, cream loafers",
      "black turtleneck, charcoal pants, black boots",
      "ivory shirt, sand chinos, tan sandals",
      "gray tee, white wide pants, gray sneakers",
      "beige sweater, cream trousers, beige loafers",
      "white button-up, black pants, white oxfords",
      "gray turtleneck, beige trousers, gray loafers",
      "cream t-shirt, white chinos, cream sneakers",
      "black sweater, charcoal pants, black derbies",
      "ivory shirt, beige wide trousers, tan sandals",
      "gray button-up, white pants, gray loafers",
      "beige turtleneck, cream pants, beige boots",
      "white sweater, gray trousers, white sneakers",
      "cream shirt, black pants, cream loafers",
      "charcoal tee, beige wide pants, gray sandals",
      "ivory button-up, white trousers, tan sneakers",
      "beige sweater, cream chinos, beige loafers",
      "black shirt, gray pants, black oxfords",
      "white turtleneck, beige trousers, white derbies",
      "cream tee, ivory wide pants, cream sandals",
      "gray button-up, white pants, gray loafers",
      "beige sweater, charcoal trousers, beige sneakers",
      "white shirt, cream pants, white boots",
      "gray turtleneck, beige trousers, gray loafers",
      "ivory tee, white wide pants, tan sandals",
      "black shirt, gray chinos, black sneakers",
      "cream button-up, beige pants, cream loafers",
      "white sweater, ivory trousers, white derbies",
      "charcoal turtleneck, black pants, gray oxfords"
    ],
    female: [
      "white blouse, beige wide pants, nude flats",
      "cream sweater, ivory trousers, cream loafers",
      "black turtleneck, charcoal midi skirt, black boots",
      "beige shirt, white wide pants, tan sandals",
      "gray tee, cream culottes, gray sneakers",
      "ivory sweater, beige pants, nude flats",
      "white tank top, black trousers, white loafers",
      "cream blouse, sand wide pants, beige sandals",
      "gray turtleneck, white pants, gray flats",
      "beige shirt, cream culottes, tan loafers",
      "black sweater, ivory midi skirt, black flats",
      "white button-up, beige wide trousers, nude sandals",
      "cream turtleneck, gray pants, cream boots",
      "ivory top, white pants, tan loafers",
      "charcoal tee, beige culottes, gray flats",
      "cream shirt, black trousers, cream sandals",
      "white sweater, ivory wide pants, white loafers",
      "beige blouse, cream culottes, beige flats",
      "gray turtleneck, white midi skirt, gray sandals",
      "black top, charcoal wide pants, black flats",
      "ivory button-up, beige trousers, tan loafers",
      "cream turtleneck, white culottes, cream sandals",
      "white tee, gray pants, nude flats",
      "beige tank, ivory wide trousers, beige loafers",
      "gray shirt, cream pants, gray sandals",
      "black sweater, beige culottes, black flats",
      "white blouse, charcoal pants, white boots",
      "cream top, ivory wide trousers, tan sandals",
      "beige turtleneck, white midi skirt, cream loafers",
      "charcoal blouse, gray pants, gray flats"
    ],
  },

  // =============================================================================
  // BOHO (30 мужских + 30 женских)
  // =============================================================================
  boho: {
    male: [
      "cream embroidered shirt, beige linen pants, tan sandals",
      "white tunic, fringed vest, blue jeans, brown boots",
      "terracotta woven shirt, beige pants, tan sandals",
      "ivory kaftan shirt, olive cargo pants, brown boots",
      "blue denim shirt, suede vest, cream pants, sandals",
      "beige ethnic tunic, white wide pants, sandals",
      "cream linen shirt, terracotta vest, brown boots",
      "white embroidered shirt, olive pants, tan sandals",
      "brown tunic, cream linen trousers, brown boots",
      "ivory fringe shirt, beige wide pants, tan sandals",
      "terracotta embroidered shirt, white pants, sandals",
      "beige tunic, olive cargo trousers, suede boots",
      "cream kaftan shirt, brown pants, tan sandals",
      "white vest over boho tee, beige pants, boots",
      "blue linen shirt, cream trousers, tan sandals",
      "ivory ethnic tunic, terracotta pants, sandals",
      "beige embroidered shirt, white trousers, boots",
      "cream shirt, olive cargo pants, brown sandals",
      "terracotta tunic, beige wide pants, tan sandals",
      "white embroidered shirt, brown trousers, boots",
      "blue cotton vest, cream linen pants, sandals",
      "ivory kaftan tunic, beige pants, brown boots",
      "beige embroidered shirt, white trousers, sandals",
      "cream tunic, terracotta pants, brown sandals",
      "white fringe shirt, olive trousers, suede boots",
      "terracotta embroidered shirt, beige pants, sandals",
      "cream tunic, white cargo trousers, tan boots",
      "ivory vest over tee, brown wide pants, sandals",
      "beige kaftan shirt, cream pants, tan sandals",
      "white embroidered tunic, olive trousers, boots"
    ],
    female: [
      "cream embroidered maxi dress, brown belt, boots",
      "white lace flowy dress, gold necklaces, sandals",
      "terracotta crochet skirt, ivory blouse, boots",
      "blue floral boho dress, fringe vest, sandals",
      "beige wide pants, embroidered crop top, sandals",
      "ivory lace maxi dress, layered jewelry, boots",
      "brown flowy midi skirt, crochet top, sandals",
      "cream peasant blouse, embroidered skirt, boots",
      "white embroidered maxi dress, suede belt, sandals",
      "terracotta boho dress, gold necklaces, sandals",
      "beige flowy pants, lace crop top, ankle boots",
      "cream floral maxi dress, brown belt, sandals",
      "white peasant blouse, denim maxi skirt, boots",
      "beige crochet dress, layered jewelry, sandals",
      "ivory wide pants, embroidered top, sandals",
      "blue boho maxi dress, lace vest, ankle boots",
      "cream flowy skirt, peasant blouse, sandals",
      "terracotta embroidered dress, suede belt, sandals",
      "white lace boho dress, gold necklaces, boots",
      "beige pants, crochet crop top, brown sandals",
      "cream floral maxi dress, scarf, ankle boots",
      "white peasant blouse, embroidered skirt, sandals",
      "ivory boho midi dress, layered jewelry, sandals",
      "cream lace skirt, crochet top, suede boots",
      "terracotta flowy pants, embroidered blouse, sandals",
      "white boho dress, lace vest, ankle boots",
      "beige peasant top, ivory maxi skirt, sandals",
      "blue embroidered dress, gold jewelry, sandals",
      "cream crochet maxi dress, brown belt, boots",
      "white flowy pants, lace top, brown sandals"
    ],
  },

  // =============================================================================
  // GRUNGE (30 мужских + 30 женских)
  // =============================================================================
  grunge: {
    male: [
      "black ripped jeans, gray band tee, black boots",
      "blue distressed jeans, black plaid flannel, brown boots",
      "charcoal ripped jeans, white graphic tee, leather jacket, black boots",
      "black slim jeans, gray hoodie, black boots",
      "navy distressed jeans, black band tee, leather jacket, boots",
      "gray ripped jeans, charcoal plaid shirt, black boots",
      "black skinny jeans, white graphic tee, olive jacket, boots",
      "blue distressed jeans, black tee, gray flannel, brown boots",
      "charcoal slim jeans, gray hoodie, leather jacket, black boots",
      "black ripped jeans, white band tee, denim jacket, boots",
      "navy torn jeans, gray plaid flannel, brown boots",
      "blue skinny jeans, black graphic tee, charcoal hoodie, boots",
      "black distressed jeans, white tee, leather jacket, boots",
      "charcoal ripped jeans, gray band tee, cargo jacket, boots",
      "navy slim jeans, black plaid shirt, black boots",
      "gray torn jeans, white graphic tee, denim jacket, boots",
      "black skinny jeans, charcoal hoodie, leather jacket, boots",
      "blue distressed jeans, gray band tee, flannel shirt, boots",
      "black ripped jeans, white graphic tee, black boots",
      "navy torn jeans, gray plaid shirt, leather jacket, boots",
      "charcoal skinny jeans, black band tee, olive jacket, boots",
      "blue ripped jeans, white graphic hoodie, black boots",
      "black distressed jeans, gray tee, denim jacket, boots",
      "navy slim jeans, charcoal flannel, leather jacket, boots",
      "gray torn jeans, black band tee, black boots",
      "black skinny jeans, white graphic tee, gray hoodie, boots",
      "blue ripped jeans, gray tee, black flannel, brown boots",
      "charcoal distressed jeans, black plaid shirt, leather jacket, boots",
      "navy torn jeans, white band tee, cargo jacket, boots",
      "black ripped jeans, gray graphic hoodie, brown boots"
    ],
    female: [
      "black ripped jeans, gray band tee, black boots",
      "blue distressed jeans, black plaid flannel, brown boots",
      "charcoal torn jeans, white graphic crop top, leather jacket, boots",
      "black slim jeans, gray hoodie, black boots",
      "navy ripped jeans, black band tee, moto jacket, boots",
      "gray distressed jeans, charcoal plaid shirt, black boots",
      "black skinny jeans, white graphic tee, olive jacket, boots",
      "blue torn jeans, black crop tee, gray flannel, brown boots",
      "charcoal ripped jeans, gray hoodie, leather jacket, boots",
      "black distressed jeans, white band tee, denim jacket, boots",
      "navy torn jeans, gray plaid flannel, brown boots",
      "blue skinny jeans, black graphic crop top, hoodie, boots",
      "black ripped jeans, white band tee, leather jacket, boots",
      "charcoal distressed jeans, gray crop tee, cargo jacket, boots",
      "navy slim jeans, black plaid shirt, black boots",
      "gray torn jeans, white graphic tank, denim jacket, boots",
      "black skinny jeans, charcoal hoodie, leather jacket, boots",
      "blue ripped jeans, gray band crop tee, flannel shirt, boots",
      "black distressed jeans, white graphic tee, black boots",
      "navy torn jeans, gray plaid shirt, leather jacket, boots",
      "charcoal skinny jeans, black band tee, olive jacket, boots",
      "blue ripped jeans, white graphic hoodie, black boots",
      "black torn jeans, gray tee, denim jacket, boots",
      "navy distressed jeans, charcoal flannel, leather jacket, boots",
      "gray ripped jeans, black band crop top, black boots",
      "black skinny jeans, white graphic tee, gray hoodie, boots",
      "blue torn jeans, gray crop tee, black flannel, brown boots",
      "charcoal distressed jeans, black plaid shirt, leather jacket, boots",
      "navy ripped jeans, white band tee, cargo jacket, boots",
      "black torn jeans, gray graphic hoodie, brown boots"
    ],
  },

  // =============================================================================
  // PREPPY (30 мужских + 30 женских)
  // =============================================================================
  preppy: {
    male: [
      "navy blazer, white oxford shirt, khaki chinos, loafers",
      "blue button-down, beige chinos, navy sweater, boat shoes",
      "white polo, navy shorts, tan loafers",
      "burgundy sweater vest, white shirt, gray trousers, oxfords",
      "navy cardigan, blue oxford, khaki pants, loafers",
      "white button-up, beige chinos, navy blazer, boat shoes",
      "pink polo, white shorts, navy loafers",
      "gray sweater, white oxford, navy chinos, oxfords",
      "navy polo, khaki pants, brown loafers",
      "white shirt, burgundy vest, gray trousers, oxfords",
      "blue cardigan, white button-down, beige chinos, loafers",
      "navy blazer, pink oxford, white pants, tan loafers",
      "white polo, navy shorts, navy loafers",
      "beige sweater, blue shirt, khaki trousers, oxfords",
      "navy button-up, white chinos, burgundy cardigan, loafers",
      "pink oxford, gray pants, white vest, brown shoes",
      "white polo, beige chinos, navy blazer, boat shoes",
      "navy sweater, white button-down, khaki shorts, loafers",
      "blue polo, white trousers, navy oxfords",
      "burgundy cardigan, white oxford, gray chinos, loafers",
      "navy blazer, blue shirt, beige pants, loafers",
      "white button-up, navy vest, khaki trousers, oxfords",
      "pink polo, white shorts, navy cardigan, boat shoes",
      "gray sweater, white shirt, navy pants, oxfords",
      "navy oxford, beige chinos, white sweater, loafers",
      "white polo, gray trousers, navy blazer, loafers",
      "blue cardigan, white button-down, khaki shorts, boat shoes",
      "burgundy sweater, pink oxford, white chinos, oxfords",
      "navy polo, beige pants, tan loafers",
      "white button-up, blue vest, navy trousers, loafers"
    ],
    female: [
      "navy blazer, white blouse, khaki pleated skirt, loafers",
      "blue oxford, beige A-line skirt, navy cardigan, flats",
      "white polo, navy tennis skirt, navy loafers",
      "burgundy vest, white blouse, gray pleated skirt, oxfords",
      "navy cardigan, blue shirt, khaki midi skirt, loafers",
      "white button-down, beige skirt, navy blazer, flats",
      "pink polo dress, white cardigan, navy loafers",
      "gray sweater, white oxford, navy A-line skirt, flats",
      "navy polo, khaki pleated skirt, brown loafers",
      "white blouse, burgundy vest, gray midi skirt, oxfords",
      "blue cardigan, white button-up, beige skirt, flats",
      "navy blazer, pink oxford, white pleated skirt, loafers",
      "white polo dress, navy cardigan, navy loafers",
      "beige sweater, blue shirt, khaki A-line skirt, oxfords",
      "navy blouse, white midi skirt, burgundy cardigan, loafers",
      "pink oxford, gray pleated skirt, white vest, flats",
      "white polo, beige tennis skirt, navy blazer, flats",
      "navy sweater, white button-down, khaki skirt, loafers",
      "blue polo dress, white cardigan, navy oxfords",
      "burgundy cardigan, white blouse, gray skirt, flats",
      "navy blazer, blue shirt, beige midi skirt, loafers",
      "white button-up, navy vest, khaki pleated skirt, oxfords",
      "pink polo, white tennis skirt, navy cardigan, flats",
      "gray sweater, white blouse, navy A-line skirt, oxfords",
      "navy oxford, beige pleated skirt, white cardigan, loafers",
      "white polo dress, gray midi skirt, navy blazer, flats",
      "blue cardigan, white button-up, khaki skirt, flats",
      "burgundy sweater, pink oxford, white skirt, oxfords",
      "navy polo, beige A-line skirt, tan loafers",
      "white blouse, blue vest, navy midi skirt, loafers"
    ],
  },

  // =============================================================================
  // DISCO (30 мужских + 30 женских)
  // =============================================================================
  disco: {
    male: [
      "gold metallic shirt, black flared pants, platform shoes",
      "silver sequined jacket, white shirt, black pants, boots",
      "burgundy blazer, black shirt, dark flared pants, platforms",
      "white suit, wide lapels, gold chain, platform shoes",
      "black shirt, silver metallic pants, platform boots",
      "navy suit, cream shirt, platform oxfords",
      "burgundy shirt, black flared trousers, gold platforms",
      "silver jacket, black turtleneck, dark pants, platforms",
      "white sequined vest, black shirt, flared pants, platforms",
      "gold blazer, burgundy shirt, black pants, platforms",
      "black suit, white shirt, silver tie, platform oxfords",
      "navy metallic shirt, white flared pants, platforms",
      "burgundy sequined jacket, black turtleneck, platforms",
      "silver shirt, black flared pants, silver platforms",
      "white blazer, gold shirt, black pants, oxfords",
      "black sequined vest, burgundy shirt, flared pants",
      "gold suit, white shirt, black tie, platforms",
      "navy jacket, silver shirt, black pants, platforms",
      "burgundy blazer, white turtleneck, dark pants, platforms",
      "silver sequined shirt, black flared pants, platforms",
      "white suit, gold chain, platform shoes",
      "black jacket, burgundy shirt, flared trousers, platforms",
      "navy metallic blazer, white shirt, dark pants, boots",
      "gold shirt, black flared trousers, gold platforms",
      "burgundy sequined vest, black shirt, dark pants",
      "silver suit, white turtleneck, platform boots",
      "black shirt, gold metallic pants, platform shoes",
      "white blazer, navy flared trousers, platforms",
      "burgundy jacket, silver shirt, black pants, boots",
      "navy sequined suit, white shirt, gold tie, platforms"
    ],
    female: [
      "gold sequined mini dress, platform heels",
      "silver metallic jumpsuit, platform sandals",
      "burgundy wrap dress, gold strappy heels",
      "white flared jumpsuit, silver platforms",
      "black sequined bodycon dress, gold heels",
      "navy maxi dress, high slit, silver platforms",
      "burgundy halter top, gold flared pants, platforms",
      "silver sequined mini dress, white boots",
      "white jumpsuit, gold belt, platform heels",
      "gold metallic wrap dress, burgundy platforms",
      "black flared pants, silver sequined top, platforms",
      "navy bodycon dress, gold platform heels",
      "burgundy jumpsuit, silver heels",
      "silver metallic mini dress, black boots",
      "white sequined halter, gold flared pants, platforms",
      "black wrap dress, silver strappy heels",
      "gold jumpsuit, white platform shoes",
      "navy metallic halter dress, burgundy heels",
      "burgundy sequined top, black pants, gold platforms",
      "silver bodycon dress, white platforms",
      "white maxi dress, gold accessories, silver heels",
      "black halter jumpsuit, gold platforms",
      "navy sequined mini dress, silver heels",
      "burgundy metallic top, white pants, platforms",
      "gold bodycon dress, black platform heels",
      "silver jumpsuit, white belt, silver platforms",
      "white sequined halter dress, navy platforms",
      "black flared pants, gold top, black heels",
      "burgundy jumpsuit, silver platforms",
      "navy wrap dress, gold accessories, navy heels"
    ],
  },

  // =============================================================================
  // LADYLIKE (только женский стиль, 30 промптов)
  // =============================================================================
  ladylike: {
    male: [],
    female: [
      "navy sheath dress, pearl necklace, black pumps",
      "pale pink A-line midi dress, white blazer, nude heels",
      "black lace cocktail dress, pearl earrings, suede pumps",
      "ivory silk blouse, navy pencil skirt, nude heels",
      "light blue fit-and-flare dress, white cardigan, pumps",
      "burgundy sheath dress, pearl accessories, black heels",
      "white tailored dress, cap sleeves, navy belt, nude pumps",
      "navy tweed jacket, white blouse, gray pencil skirt, heels",
      "pale pink silk midi dress, pearl necklace, nude pumps",
      "black A-line dress, white collar, burgundy heels",
      "ivory sheath dress, navy blazer, black pumps",
      "light blue tailored dress, nude patent heels",
      "burgundy fit-and-flare dress, black belt, suede pumps",
      "navy pencil dress, white collar, pearl necklace, heels",
      "pale pink tweed jacket, white blouse, black pumps",
      "white cocktail dress, navy accessories, burgundy heels",
      "black silk blouse, ivory pencil skirt, black pumps",
      "navy lace-trim midi dress, white cardigan, nude heels",
      "light blue sheath dress, pearl accessories, pumps",
      "burgundy A-line dress, white blazer, black heels",
      "ivory fit-and-flare dress, navy belt, nude pumps",
      "pale pink silk blouse, black pencil skirt, patent heels",
      "navy tailored dress, white collar, burgundy pumps",
      "white tweed jacket, light blue blouse, gray skirt, heels",
      "black sheath dress, pearl earrings, nude pumps",
      "burgundy midi dress, white cardigan, black heels",
      "navy cocktail dress, ivory accessories, black pumps",
      "pale pink A-line dress, black blazer, nude heels",
      "ivory silk dress, navy belt, pearl necklace, pumps",
      "light blue pencil dress, white collar, nude heels"
    ],
  },

  // =============================================================================
  // SCANDINAVIAN (30 мужских + 30 женских)
  // =============================================================================
  scandinavian: {
    male: [
      "cream shirt, beige chinos, brown sandals",
      "white t-shirt, gray trousers, white sneakers",
      "gray sweater, beige pants, tan loafers",
      "ivory button-up, white wide trousers, cream sandals",
      "beige shirt, cream pants, brown loafers",
      "white tee, gray chinos, white sneakers",
      "gray turtleneck, beige trousers, tan oxfords",
      "cream button-up, white pants, brown sandals",
      "ivory sweater, gray trousers, cream loafers",
      "beige shirt, white wide pants, tan sandals",
      "white tee, cream chinos, gray sneakers",
      "gray button-up, beige trousers, brown loafers",
      "cream sweater, white pants, tan oxfords",
      "ivory shirt, gray trousers, cream sandals",
      "beige turtleneck, white wide pants, brown loafers",
      "white button-up, gray chinos, white sneakers",
      "cream tee, beige trousers, tan sandals",
      "gray shirt, ivory pants, gray loafers",
      "beige sweater, white trousers, brown oxfords",
      "white button-up, cream wide pants, tan sandals",
      "ivory tee, gray chinos, cream sneakers",
      "beige shirt, white trousers, brown loafers",
      "cream turtleneck, gray pants, tan sandals",
      "white sweater, beige trousers, white oxfords",
      "gray button-up, ivory wide pants, gray sandals",
      "beige tee, cream chinos, brown loafers",
      "white shirt, gray trousers, tan sneakers",
      "ivory button-up, beige pants, cream sandals",
      "cream sweater, white trousers, brown oxfords",
      "gray tee, beige wide pants, tan sandals"
    ],
    female: [
      "cream midi dress, brown belt, tan sandals",
      "white shirt, beige pants, white sneakers",
      "gray sweater, ivory trousers, tan loafers",
      "beige blouse, white wide pants, cream sandals",
      "ivory t-shirt, gray culottes, brown flats",
      "white dress, beige belt, tan sandals",
      "gray turtleneck, cream midi skirt, gray boots",
      "beige blouse, white wide pants, brown sandals",
      "cream sweater dress, tan belt, ivory flats",
      "white shirt, gray pants, cream loafers",
      "ivory midi dress, beige sandals",
      "beige tee, white culottes, tan sandals",
      "gray blouse, cream wide trousers, gray flats",
      "white sweater, beige midi skirt, brown boots",
      "cream shirt dress, ivory belt, tan sandals",
      "beige turtleneck, white pants, cream flats",
      "white tee, gray culottes, tan sandals",
      "ivory midi dress, brown belt, beige flats",
      "gray sweater, cream trousers, gray loafers",
      "white blouse, beige wide pants, tan sandals",
      "beige dress, cream belt, brown sandals",
      "cream turtleneck, white midi skirt, tan boots",
      "ivory shirt, gray pants, cream flats",
      "white tee, beige culottes, gray sandals",
      "beige sweater dress, tan belt, brown flats",
      "gray blouse, white wide trousers, ivory loafers",
      "cream midi dress, beige sandals",
      "white turtleneck, gray pants, tan boots",
      "ivory shirt, cream trousers, beige flats",
      "beige dress, white belt, brown sandals"
    ],
  },

  // =============================================================================
  // GAUCHO (30 мужских + 30 женских)
  // =============================================================================
  gaucho: {
    male: [
      "white shirt, brown vest, beige gaucho pants, boots",
      "cream shirt, brown belt, olive gaucho trousers, boots",
      "ivory shirt, tan vest, beige wide pants, boots",
      "white shirt, brown belt, cream gaucho pants, boots",
      "beige shirt, vest, olive wide trousers, boots",
      "cream button-up, brown belt, beige gaucho pants, boots",
      "white shirt, tan vest, ivory wide trousers, boots",
      "beige shirt, brown belt, cream gaucho pants, boots",
      "ivory shirt, vest, olive wide pants, boots",
      "white shirt, brown belt, beige gaucho trousers, boots",
      "cream shirt, tan vest, ivory wide pants, cowboy boots",
      "beige button-up, brown belt, cream gaucho pants, boots",
      "white shirt, vest, olive trousers, riding boots",
      "ivory shirt, brown belt, beige wide pants, boots",
      "cream button-up, tan vest, white gaucho trousers, boots",
      "beige shirt, brown belt, ivory wide pants, boots",
      "white shirt, vest, cream gaucho pants, riding boots",
      "beige button-up, tan belt, olive wide trousers, boots",
      "ivory shirt, brown vest, beige gaucho pants, boots",
      "cream shirt, belt, white wide trousers, boots",
      "white button-up, tan vest, ivory gaucho pants, boots",
      "beige shirt, brown belt, cream wide trousers, boots",
      "beige shirt, vest, olive gaucho pants, boots",
      "white button-up, brown belt, beige wide pants, boots",
      "ivory shirt, tan vest, cream gaucho trousers, boots",
      "cream shirt, brown belt, white wide pants, boots",
      "beige shirt, vest, ivory gaucho pants, boots",
      "white button-up, brown vest, beige trousers, boots",
      "beige shirt, belt, cream gaucho pants, boots",
      "ivory shirt, tan vest, olive wide trousers, boots"
    ],
    female: [
      "white blouse, brown corset, beige gaucho pants, boots",
      "cream shirt, brown belt, olive gaucho trousers, boots",
      "ivory blouse, tan vest, beige wide pants, boots",
      "white peasant top, brown belt, cream gaucho pants, boots",
      "beige shirt, corset, olive trousers, boots",
      "cream embroidered blouse, brown belt, beige pants, boots",
      "white top, tan vest, ivory wide trousers, boots",
      "beige blouse, brown belt, cream gaucho pants, boots",
      "ivory peasant shirt, corset, olive wide pants, boots",
      "white blouse, brown belt, beige gaucho trousers, boots",
      "cream top, tan vest, ivory wide pants, cowboy boots",
      "beige blouse, brown belt, cream gaucho pants, boots",
      "white shirt, corset, olive trousers, boots",
      "ivory embroidered top, brown belt, beige pants, boots",
      "cream peasant blouse, tan vest, white gaucho pants, boots",
      "beige shirt, brown belt, ivory wide pants, boots",
      "white blouse, vest, cream gaucho pants, boots",
      "beige top, tan belt, olive wide trousers, boots",
      "ivory blouse, brown vest, beige gaucho pants, boots",
      "cream shirt, belt, white wide trousers, boots",
      "white embroidered blouse, tan corset, ivory pants, boots",
      "beige peasant top, brown belt, cream trousers, boots",
      "beige blouse, corset, olive gaucho pants, boots",
      "white top, brown belt, beige wide pants, boots",
      "ivory shirt, tan vest, cream gaucho trousers, boots",
      "cream blouse, brown belt, white wide pants, boots",
      "beige top, corset, ivory gaucho pants, boots",
      "white peasant blouse, brown vest, beige trousers, boots",
      "beige shirt, belt, cream gaucho pants, boots",
      "ivory embroidered top, tan vest, olive trousers, boots"
    ],
  },

  // =============================================================================
  // URBAN-CHIC (30 мужских + 30 женских)
  // =============================================================================
  "urban-chic": {
    male: [
      "black jacket, white tee, dark slim jeans, chelsea boots",
      "gray overcoat, black turtleneck, charcoal trousers, oxfords",
      "navy bomber, white button-up, black chinos, sneakers",
      "charcoal blazer, black crew neck, dark jeans, loafers",
      "black denim jacket, gray tee, navy pants, sneakers",
      "brown jacket, white shirt, beige chinos, chelsea boots",
      "dark gray coat, black turtleneck, charcoal trousers",
      "navy quilted jacket, white tee, black jeans, loafers",
      "black blazer, gray crew neck, navy chinos, sneakers",
      "charcoal bomber, white button-up, black pants, oxfords",
      "brown jacket, black turtleneck, dark jeans, boots",
      "gray overcoat, white tee, charcoal trousers, loafers",
      "navy jacket, black shirt, dark jeans, sneakers",
      "black coat, gray crew neck, black chinos, derbies",
      "charcoal blazer, white tee, navy slim pants, sneakers",
      "gray bomber, black turtleneck, charcoal trousers, boots",
      "brown jacket, white button-up, black jeans, oxfords",
      "black overcoat, gray crew neck, dark chinos, loafers",
      "navy blazer, white tee, charcoal pants, sneakers",
      "charcoal jacket, black shirt, dark jeans, boots",
      "gray coat, white turtleneck, black trousers, derbies",
      "black bomber, gray tee, navy chinos, sneakers",
      "brown blazer, white crew neck, charcoal pants, loafers",
      "navy overcoat, black tee, dark jeans, oxfords",
      "charcoal jacket, gray button-up, black pants, boots",
      "black blazer, white turtleneck, dark chinos, sneakers",
      "gray jacket, black crew neck, navy trousers, loafers",
      "brown bomber, white tee, charcoal jeans, chelsea boots",
      "navy coat, black shirt, dark chinos, sneakers",
      "gray jacket, white turtleneck, black slim pants"
    ],
    female: [
      "black moto jacket, white blouse, dark jeans, ankle boots",
      "gray coat, black turtleneck, charcoal pants, nude pumps",
      "navy bomber, white tee, black slim pants, sneakers",
      "charcoal blazer, black crew neck, dark jeans, loafers",
      "black denim jacket, gray tank, navy jeans, sneakers",
      "brown jacket, white blouse, beige pants, ankle boots",
      "gray trench coat, black turtleneck, charcoal culottes",
      "navy quilted jacket, white tee, black jeans, loafers",
      "black blazer, gray top, navy slim pants, pumps",
      "charcoal bomber, white button-up, black jeans, boots",
      "brown moto jacket, black turtleneck, dark jeans, boots",
      "gray overcoat, white blouse, charcoal pants, flats",
      "navy jacket, black tee, dark jeans, sneakers",
      "black belted coat, gray crew neck, black pants, loafers",
      "charcoal blazer, white tank, navy jeans, sneakers",
      "gray bomber, black turtleneck, charcoal pants, boots",
      "brown jacket, white blouse, black jeans, tan pumps",
      "black overcoat, gray turtleneck, dark culottes, flats",
      "navy blazer, white tee, charcoal slim pants, sneakers",
      "charcoal jacket, black crew neck, dark jeans, boots",
      "gray trench coat, white tank, black pants, flats",
      "black bomber, gray blouse, navy jeans, sneakers",
      "brown blazer, white turtleneck, charcoal pants, loafers",
      "navy coat, black top, dark jeans, ankle boots",
      "charcoal jacket, gray button-up, black pants, pumps",
      "black blazer, white turtleneck, dark pants, sneakers",
      "gray moto jacket, black crew neck, navy culottes, loafers",
      "brown bomber, white tee, charcoal jeans, ankle boots",
      "navy coat, black blouse, dark slim pants, flats",
      "gray jacket, white turtleneck, black jeans"
    ],
  },

  // =============================================================================
  // EVENING-ELEGANT (30 мужских + 30 женских)
  // =============================================================================
  "evening-elegant": {
    male: [
      "black tuxedo, white shirt, black bow tie, oxfords",
      "navy dinner jacket, white shirt, black bow tie",
      "charcoal tuxedo, white shirt, black bow tie, shoes",
      "black dinner jacket, white shirt, burgundy bow tie",
      "midnight blue tuxedo, white shirt, black tie, shoes",
      "black shawl-collar tuxedo, white shirt, bow tie",
      "navy blazer, white shirt, black bow tie, oxfords",
      "charcoal tuxedo, white shirt, burgundy tie",
      "black peak-lapel jacket, white shirt, bow tie",
      "midnight blue tuxedo, white shirt, navy bow tie",
      "black tuxedo, white shirt, black bow tie",
      "navy dinner jacket, white shirt, burgundy tie",
      "charcoal blazer, white shirt, black bow tie",
      "black shawl-collar jacket, white shirt, black tie",
      "midnight blue tuxedo, white shirt, bow tie",
      "navy peak-lapel jacket, white shirt, navy tie",
      "black tuxedo, white shirt, burgundy bow tie",
      "charcoal dinner jacket, white shirt, black bow tie",
      "black tuxedo, white shirt, black tie",
      "navy tuxedo, white shirt, black bow tie",
      "midnight blue blazer, white shirt, navy bow tie",
      "black shawl-collar tuxedo, white shirt, burgundy tie",
      "charcoal peak-lapel jacket, white shirt, bow tie",
      "navy dinner jacket, white shirt, black tie",
      "black tuxedo, white shirt, black bow tie",
      "midnight blue tuxedo, white shirt, navy bow tie",
      "charcoal blazer, white shirt, black bow tie",
      "black dinner jacket, white shirt, burgundy tie",
      "navy shawl-collar tuxedo, white shirt, bow tie",
      "midnight blue tuxedo, white shirt, black tie"
    ],
    female: [
      "black sequined gown, earrings, heels",
      "navy maxi dress, high slit, nude heels",
      "burgundy gown, draped neckline, pumps",
      "emerald evening dress, black strappy heels",
      "black lace mermaid gown, pearl earrings, heels",
      "midnight blue sequined dress, navy pumps",
      "burgundy maxi dress, cape sleeves, nude heels",
      "black column gown, strappy heels",
      "navy off-shoulder dress, navy pumps",
      "emerald gown, side draping, black heels",
      "black sequined mermaid dress, black pumps",
      "burgundy maxi dress, burgundy heels",
      "midnight blue lace gown, nude heels",
      "black evening dress, plunging neckline, pumps",
      "navy maxi dress, empire waist, navy heels",
      "emerald sequined gown, black heels",
      "burgundy mermaid dress, burgundy pumps",
      "black maxi dress with slit, heels",
      "midnight blue column gown, navy heels",
      "navy lace evening dress, nude pumps",
      "black gown, flowing train, heels",
      "emerald maxi dress, black pumps",
      "burgundy sequined evening dress, heels",
      "midnight blue mermaid gown, navy pumps",
      "black column dress, cape detail, black heels",
      "navy gown, deep V-neck, navy pumps",
      "emerald lace evening dress, strappy heels",
      "burgundy maxi dress, ruffles, nude pumps",
      "black sequined column gown, black heels",
      "midnight blue mermaid dress, navy heels"
    ],
  },

  // =============================================================================
  // GLAMOUR (30 мужских + 30 женских)
  // =============================================================================
  glamour: {
    male: [
      "black blazer, white shirt, black pants, shoes",
      "navy sequined jacket, white shirt, black trousers",
      "burgundy suit, white shirt, black shoes",
      "black tuxedo, white shirt, shoes",
      "charcoal metallic blazer, black shirt, dark trousers",
      "midnight blue suit, white shirt, shoes",
      "black sequined jacket, white shirt, black pants",
      "burgundy blazer, white shirt, black trousers",
      "navy tuxedo, white shirt, shoes",
      "black metallic jacket, white shirt, charcoal pants",
      "charcoal suit, black shirt, black oxfords",
      "midnight blue sequined blazer, white shirt, shoes",
      "burgundy jacket, white shirt, black pants, shoes",
      "black suit, white shirt, oxfords",
      "navy metallic blazer, white shirt, black trousers",
      "charcoal sequined jacket, black shirt, dark pants",
      "burgundy tuxedo, white shirt, black shoes",
      "black suit, white shirt, shoes",
      "midnight blue blazer, white shirt, black oxfords",
      "navy dinner jacket, white shirt, shoes",
      "black metallic suit, white shirt, shoes",
      "charcoal blazer, black shirt, oxfords",
      "burgundy sequined jacket, white shirt, black pants",
      "midnight blue suit, white shirt, shoes",
      "black dinner jacket, white shirt, oxfords",
      "navy metallic tuxedo, white shirt, shoes",
      "charcoal suit, white shirt, black shoes",
      "burgundy blazer, black shirt, oxfords",
      "black sequined suit, white shirt, shoes",
      "midnight blue metallic jacket, white shirt, oxfords"
    ],
    female: [
      "gold sequined mini dress, gold strappy heels",
      "black bodycon dress, deep V, black pumps",
      "burgundy gown, side slit, burgundy heels",
      "silver metallic halter dress, silver heels",
      "navy sequined maxi dress, navy pumps",
      "black lace mini dress, sequin overlay, heels",
      "emerald bodycon dress, black strappy heels",
      "burgundy sequined mermaid gown, burgundy pumps",
      "gold metallic wrap dress, gold heels",
      "navy maxi dress, plunging neckline, navy heels",
      "black slip dress, black pumps",
      "burgundy lace bodycon dress, burgundy heels",
      "silver sequined mini dress, silver heels",
      "midnight blue gown, navy pumps",
      "black metallic bodycon dress, black heels",
      "emerald sequined maxi dress, black heels",
      "burgundy mini dress, burgundy pumps",
      "gold wrap dress, gold heels",
      "navy metallic bodycon dress, navy heels",
      "black sequined mermaid gown, black pumps",
      "burgundy maxi dress, cut-outs, burgundy heels",
      "silver slip dress, silver strappy heels",
      "midnight blue sequined bodycon, navy pumps",
      "black mini dress, black heels",
      "emerald metallic gown, black heels",
      "burgundy sequined wrap dress, burgundy pumps",
      "gold lace bodycon dress, gold heels",
      "navy bodycon dress, navy strappy heels",
      "black mermaid gown, black pumps",
      "silver sequined maxi dress, silver heels"
    ],
  },

  // =============================================================================
  // ROCK (30 мужских + 30 женских)
  // =============================================================================
  rock: {
    male: [
      "black jacket, white band tee, ripped jeans, boots",
      "brown studded jacket, black graphic tee, ripped jeans, boots",
      "black denim vest, gray tank, black skinny jeans, boots",
      "distressed jacket, black band tee, ripped jeans, boots",
      "black biker jacket, white skull tee, torn jeans, boots",
      "brown jacket, black graphic tee, dark ripped jeans, boots",
      "black studded vest, gray band tank, skinny jeans, boots",
      "worn jacket, white band tee, distressed jeans, boots",
      "black moto jacket, gray tee, ripped jeans, boots",
      "brown jacket, black graphic tank, torn jeans, boots",
      "black jacket, white skeleton tee, ripped jeans, boots",
      "studded vest, gray band tee, distressed jeans, boots",
      "brown biker jacket, black graphic tee, torn jeans, boots",
      "black jacket, white band tank, ripped jeans, boots",
      "charcoal studded jacket, black tee, ripped jeans, boots",
      "black denim vest, gray graphic tank, torn jeans, boots",
      "brown moto jacket, white band tee, ripped jeans, boots",
      "black biker jacket, gray skull tee, ripped jeans, boots",
      "worn jacket, black graphic tank, torn jeans, boots",
      "black studded jacket, white band tee, ripped jeans, boots",
      "brown distressed vest, gray tee, torn jeans, boots",
      "black moto jacket, white skeleton tank, ripped jeans, boots",
      "studded vest, black band tee, ripped skinny jeans, boots",
      "brown biker jacket, gray graphic tee, torn jeans, boots",
      "black jacket, white band tank, distressed jeans, boots",
      "charcoal jacket, gray tee, ripped dark jeans, boots",
      "black denim jacket, white graphic tank, torn jeans, boots",
      "brown moto jacket, black band tee, ripped jeans, boots",
      "black biker jacket, gray skull tee, ripped jeans, boots",
      "worn black jacket, white graphic tee, torn jeans, boots"
    ],
    female: [
      "black moto jacket, white band tee, ripped jeans, boots",
      "brown studded jacket, black graphic tank, ripped jeans, boots",
      "black vest, gray band crop top, ripped jeans, boots",
      "distressed jacket, white skull tee, torn jeans, boots",
      "black biker jacket, gray graphic crop top, ripped jeans, boots",
      "brown jacket, black band tank, torn dark jeans, boots",
      "black studded vest, white graphic tee, ripped jeans, boots",
      "worn moto jacket, gray band crop top, ripped jeans, boots",
      "black jacket, white skeleton tank, torn jeans, boots",
      "brown jacket, black graphic crop tee, ripped jeans, boots",
      "black biker jacket, gray band tank, ripped jeans, boots",
      "studded vest, white graphic tee, ripped jeans, boots",
      "brown moto jacket, black band crop top, torn jeans, boots",
      "black jacket, gray graphic tank, ripped jeans, boots",
      "charcoal studded jacket, white band tee, ripped jeans, boots",
      "black vest, gray crop top, torn jeans, boots",
      "brown biker jacket, white graphic tank, ripped jeans, boots",
      "black moto jacket, gray skull crop tee, ripped jeans, boots",
      "worn jacket, black band tank, torn jeans, boots",
      "black studded jacket, white graphic tee, ripped jeans, boots",
      "brown distressed vest, gray band crop top, torn jeans, boots",
      "black moto jacket, white skeleton tank, ripped jeans, boots",
      "studded vest, black graphic crop tee, ripped jeans, boots",
      "brown biker jacket, gray band tank, torn jeans, boots",
      "black jacket, white graphic crop top, ripped jeans, boots",
      "charcoal moto jacket, gray band tee, ripped jeans, boots",
      "black denim vest, white graphic tank, torn jeans, boots",
      "brown jacket, black band crop top, ripped jeans, boots",
      "black biker jacket, gray skull tank, ripped jeans, boots",
      "worn black moto jacket, white graphic tee, torn jeans, boots"
    ],
  },

  // =============================================================================
  // RESORT (30 мужских + 30 женских)
  // =============================================================================
  resort: {
    male: [
      "white shirt, beige shorts, brown sandals",
      "cream button-up, khaki shorts, tan boat shoes",
      "blue shirt, white shorts, beige espadrilles",
      "ivory shirt, sand pants, brown sandals",
      "white polo, beige shorts, tan loafers",
      "cream button-up, white pants, brown sandals",
      "beige shirt, khaki shorts, straw hat, tan shoes",
      "white shirt, cream shorts, beige sandals",
      "ivory polo, white pants, brown espadrilles",
      "blue shirt, beige shorts, tan sandals",
      "cream button-up, white shorts, straw hat, boat shoes",
      "white polo, khaki pants, beige sandals",
      "beige shirt, cream shorts, tan loafers",
      "ivory button-up, white shorts, brown sandals",
      "cream shirt, beige pants, straw hat, tan espadrilles",
      "white polo, sand shorts, brown boat shoes",
      "blue shirt, white pants, beige sandals",
      "cream shirt, khaki shorts, straw hat, tan sandals",
      "ivory button-up, beige shorts, brown loafers",
      "white shirt, cream pants, tan boat shoes",
      "beige polo, white shorts, straw hat, espadrilles",
      "cream shirt, khaki pants, brown sandals",
      "white button-up, beige shorts, tan boat shoes",
      "ivory polo, white pants, straw hat, sandals",
      "cream shirt, sand shorts, beige loafers",
      "white button-up, beige pants, tan sandals",
      "blue polo, white shorts, straw hat, espadrilles",
      "cream shirt, khaki shorts, tan boat shoes",
      "ivory button-up, cream pants, beige sandals",
      "white polo, beige shorts, straw hat, sandals"
    ],
    female: [
      "white maxi dress, straw hat, tan sandals",
      "cream sundress, beige tote, brown sandals",
      "blue flowy maxi dress, straw fedora, nude sandals",
      "ivory midi dress, sun hat, tan espadrilles",
      "white off-shoulder dress, straw bag, brown sandals",
      "cream wrap dress, straw hat, tan sandals",
      "blue maxi dress, beach bag, nude sandals",
      "white shirt dress, fedora, beige espadrilles",
      "ivory sundress, straw tote, tan sandals",
      "beige maxi dress, sun hat, brown sandals",
      "white off-shoulder sundress, straw bag, espadrilles",
      "cream maxi dress, fedora, nude sandals",
      "blue midi dress, straw bag, tan sandals",
      "ivory wrap dress, sun hat, beige espadrilles",
      "white maxi dress, woven tote, brown sandals",
      "cream sundress, straw hat, tan sandals",
      "beige dress, fedora, nude espadrilles",
      "white shirt dress, straw bag, tan sandals",
      "ivory off-shoulder maxi dress, sun hat, sandals",
      "blue sundress, straw tote, beige espadrilles",
      "cream midi dress, straw fedora, tan sandals",
      "white wrap dress, beach bag, nude sandals",
      "blue maxi dress, sun hat, tan espadrilles",
      "ivory sundress, straw bag, brown sandals",
      "beige maxi dress, fedora, tan sandals",
      "white off-shoulder dress, tote, espadrilles",
      "cream midi dress, straw hat, nude sandals",
      "blue wrap dress, beach bag, tan sandals",
      "ivory maxi dress, straw fedora, espadrilles",
      "white sundress, woven bag, tan sandals"
    ],
  },

  // =============================================================================
  // VINTAGE-50S (30 мужских + 30 женских)
  // =============================================================================
  "vintage-50s": {
    male: [
      "navy suit, white shirt, skinny black tie, oxfords",
      "charcoal suit, blue shirt, black tie, wingtips",
      "brown tweed jacket, cream shirt, burgundy tie, loafers",
      "black suit, white shirt, thin black tie, shoes",
      "gray suit, pink shirt, navy skinny tie, oxfords",
      "navy cardigan, white button-down, gray trousers, loafers",
      "charcoal suit, blue shirt, black tie, brogues",
      "brown suit, cream shirt, burgundy tie, oxfords",
      "black jacket, white shirt, gray pants, black tie",
      "gray suit, blue shirt, navy knit tie, loafers",
      "navy blazer, white button-down, khaki trousers, oxfords",
      "charcoal cardigan, blue shirt, gray pants, black tie",
      "brown tweed suit, cream shirt, skinny tie, brogues",
      "navy suit, white shirt, burgundy tie, oxfords",
      "gray jacket, pink shirt, black knit tie, wingtips",
      "black suit, blue shirt, thin navy tie, shoes",
      "brown cardigan, white button-down, gray trousers, loafers",
      "charcoal suit, cream shirt, black tie, wingtips",
      "navy jacket, blue shirt, gray pants, skinny tie",
      "gray tweed suit, white shirt, burgundy tie, oxfords",
      "black blazer, blue shirt, charcoal trousers, tie",
      "brown suit, white shirt, navy tie, loafers",
      "navy cardigan, cream shirt, khaki pants, burgundy tie",
      "charcoal suit, pink shirt, black tie, brogues",
      "gray suit, blue shirt, burgundy skinny tie, wingtips",
      "black jacket, white button-down, gray trousers, tie",
      "brown tweed blazer, cream shirt, black tie, loafers",
      "navy suit, blue shirt, burgundy tie, shoes",
      "gray cardigan, white shirt, charcoal pants, tie",
      "charcoal suit, blue shirt, navy tie, shoes"
    ],
    female: [
      "red polka dot dress, white belt, red kitten heels",
      "navy swing dress, white collar, nude pumps",
      "pink gingham halter dress, white cardigan, flats",
      "black cocktail dress, red belt, kitten heels",
      "turquoise fit-and-flare dress, white pearls, pumps",
      "red cherry print swing dress, white belt, heels",
      "navy polka dot dress, white collar, pumps",
      "pink floral halter dress, white bolero, heels",
      "checkered dress, red belt, black pumps",
      "mint swing dress, white pearls, nude heels",
      "red fit-and-flare dress, white collar, flats",
      "navy halter dress, white cardigan, nude pumps",
      "pink rose print dress, white belt, heels",
      "black cocktail dress, red belt, black pumps",
      "turquoise polka dot swing dress, white collar, heels",
      "red gingham dress, white belt, red heels",
      "navy cherry print dress, white cardigan, flats",
      "pink halter swing dress, nude pumps",
      "striped dress, red belt, kitten heels",
      "mint polka dot dress, white collar, heels",
      "red cocktail dress, white pearls, pumps",
      "navy floral halter dress, white belt, heels",
      "pink swing dress, white collar, cardigan, flats",
      "black dress with red polka dots, black pumps",
      "turquoise gingham dress, white pearls, heels",
      "red halter dress, white belt, heels",
      "navy checkered swing dress, white collar, pumps",
      "pink cherry print dress, white cardigan, heels",
      "black cocktail dress, red belt, black pumps",
      "mint halter dress, white accessories, nude heels"
    ],
  },

  // =============================================================================
  // TRENDS-2026 (30 мужских + 30 женских)
  // =============================================================================
  "trends-2026": {
    male: [
      "silver puffer jacket, black tech pants, futuristic sneakers",
      "holographic bomber, white turtleneck, gray pants, sneakers",
      "black asymmetric jacket, gray shirt, cargo pants, platforms",
      "chrome vest, white top, black utility pants, sneakers",
      "navy holographic coat, black turtleneck, dark pants, boots",
      "gold metallic hoodie, gray joggers, white platforms",
      "iridescent purple jacket, black top, cargo pants, sneakers",
      "silver tech blazer, white shirt, black pants, shoes",
      "holographic blue puffer vest, gray turtleneck, navy pants",
      "black asymmetric bomber, white top, cargo pants, shoes",
      "chrome coat, black top, gray utility pants, sneakers",
      "navy iridescent jacket, white turtleneck, dark pants",
      "silver hoodie, black joggers, white futuristic sneakers",
      "purple holographic vest, gray shirt, black pants, boots",
      "iridescent blue blazer, white top, navy pants, platforms",
      "black metallic puffer, gray turtleneck, dark pants, sneakers",
      "chrome gold jacket, white shirt, black pants, sneakers",
      "holographic silver bomber, black top, gray pants, platforms",
      "navy metallic coat, white turtleneck, utility pants, boots",
      "iridescent purple vest, gray shirt, black pants, sneakers",
      "metallic blue jacket, white top, navy joggers, shoes",
      "chrome silver blazer, black turtleneck, gray pants",
      "holographic gold hoodie, white top, dark pants, sneakers",
      "iridescent navy coat, gray shirt, black pants, boots",
      "metallic purple vest, white top, gray pants, sneakers",
      "silver holographic bomber, black turtleneck, navy pants",
      "chrome blue puffer, white shirt, gray pants, sneakers",
      "iridescent gold blazer, black top, dark pants, boots",
      "holographic silver coat, gray turtleneck, black pants",
      "metallic navy jacket, white top, gray joggers, sneakers"
    ],
    female: [
      "silver asymmetric dress, chrome platform heels",
      "iridescent purple bodycon dress, futuristic heels",
      "chrome gold mini dress, metallic tights, silver boots",
      "holographic blue wrap dress, iridescent pumps",
      "black tech dress, neon accents, chrome boots",
      "navy iridescent maxi dress, high slit, heels",
      "metallic pink asymmetric top, chrome skirt, platforms",
      "holographic silver bodycon dress, chrome heels",
      "iridescent gold mini dress, metallic pumps",
      "chrome blue asymmetric dress, holographic boots",
      "metallic purple wrap dress, silver platforms",
      "holographic navy maxi dress, chrome heels",
      "silver crop top, iridescent midi skirt, platforms",
      "iridescent pink bodycon dress, chrome pumps",
      "black asymmetric dress, metallic panels, boots",
      "chrome gold wrap dress, metallic heels",
      "holographic blue mini dress, chrome sandals",
      "metallic navy bodycon dress, platforms",
      "iridescent purple asymmetric dress, chrome pumps",
      "silver maxi dress, high slit, futuristic heels",
      "holographic pink wrap dress, metallic boots",
      "chrome blue bodycon dress, holographic heels",
      "iridescent gold top, metallic skirt, platforms",
      "metallic purple mini dress, silver pumps",
      "holographic navy dress, chrome heels",
      "silver wrap dress, metallic pumps",
      "iridescent blue bodycon dress, futuristic boots",
      "metallic gold asymmetric maxi dress, platforms",
      "chrome pink mini dress, metallic heels",
      "holographic silver bodycon dress, futuristic pumps"
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

  if (gender === "MALE" && outfits.male.length > 0) {
    return outfits.male[Math.floor(Math.random() * outfits.male.length)];
  } else if (gender === "FEMALE" && outfits.female.length > 0) {
    return outfits.female[Math.floor(Math.random() * outfits.female.length)];
  }

  // Fallback: используем непустой массив
  const fallback = outfits.male.length > 0 ? outfits.male : outfits.female;
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// =============================================================================
// ДАННЫЕ ЛОКАЦИЙ: 10 случайных вариантов для каждой (фон + освещение)
// =============================================================================

interface LocationData {
  lighting: string;
  background: string;
}

// Массивы из 10 вариантов для каждой локации
const locationVariants: Record<string, LocationData[]> = {
  "city-day": [
    { background: "European cobblestone street, pastel facades", lighting: "soft sunlight, wet pavement reflections" },
    { background: "modern boulevard, glass skyscraper facades", lighting: "bright morning light, long shadows" },
    { background: "Parisian alley, ivy balconies, flower boxes", lighting: "warm golden midday sun" },
    { background: "industrial quarter, graffiti brick walls", lighting: "sharp angled sunlight, contrast shadows" },
    { background: "central square with fountain, marble steps", lighting: "soft morning light with haze" },
    { background: "tree-lined alley, linden trees both sides", lighting: "warm sunset, god rays through foliage" },
    { background: "shopping street, boutique windows", lighting: "bright afternoon light, wet sidewalk" },
    { background: "riverfront embankment, metal railings", lighting: "diffused light, sun reflection on water" },
    { background: "quiet residential quarter, vine facades", lighting: "soft late morning light" },
    { background: "modern bridge over river, steel structures", lighting: "bright zenith sun, high contrast" },
  ],
  "city-night": [
    { background: "boulevard with neon signs, rain puddles", lighting: "warm orange lamps, deep blue shadows" },
    { background: "quiet alley, gas lanterns, wet cobblestones", lighting: "cold moonlight, warm artificial mix" },
    { background: "skyscraper quarter, glass facade reflections", lighting: "deep indigo sky glow" },
    { background: "night embankment, city lights in water", lighting: "warm glare on wet pavement" },
    { background: "industrial zone, lone streetlight pool", lighting: "cold light, long metal shadows" },
    { background: "historic square, facade uplighting", lighting: "warm amber glow, black sky" },
    { background: "shopping street after closing, neon in windows", lighting: "cold and warm light mix" },
    { background: "bridge with arched lanterns, light trails", lighting: "deep blue, warm accents" },
    { background: "residential quarter, yellow-lit windows", lighting: "cozy atmosphere, soft shadows" },
    { background: "rooftop with night megacity panorama", lighting: "cold moonlight, warm concrete glare" },
  ],
  "boutique": [
    { background: "luxury fashion boutique, marble floor, clothing racks", lighting: "soft warm spotlights" },
    { background: "modern designer boutique, glass shelves, mirrors", lighting: "bright even lighting" },
    { background: "high-end boutique, velvet curtains, gold accents", lighting: "warm golden glow" },
    { background: "chic boutique interior, mannequins, shoe displays", lighting: "soft diffused light" },
    { background: "fashion boutique, floor-to-ceiling mirrors, racks", lighting: "natural window light" },
    { background: "elegant boutique, wood shelves, curated clothes", lighting: "warm ambient lighting" },
    { background: "trendy boutique, neon sign, designer bags on wall", lighting: "soft pink-toned light" },
    { background: "minimalist boutique, white walls, select garments", lighting: "bright clean lighting" },
    { background: "vintage boutique, exposed brick, hat boxes, scarves", lighting: "soft warm Edison bulbs" },
    { background: "premium boutique, fitting area, styled accessories", lighting: "warm directional light" },
  ],
  "beach": [
    { background: "deserted sandy beach, pink-golden sky", lighting: "soft dawn haze, morning glow" },
    { background: "tropical beach, palm trees, turquoise water", lighting: "bright sun, palm shadows on sand" },
    { background: "black pebble beach, wave patterns on rocks", lighting: "soft diffused light, fog over water" },
    { background: "white sand beach, turquoise water sparkle", lighting: "warm sunset, long palm shadows" },
    { background: "rocky beach, waves crashing, spray", lighting: "backlit sunset, water mist glow" },
    { background: "stormy beach, wet sand reflecting sky", lighting: "silver light through cloud breaks" },
    { background: "secluded cove, golden sand, coconut palms", lighting: "soft morning light" },
    { background: "beach with dunes and sea grass", lighting: "golden late morning, grass shadows" },
    { background: "urban beach, wooden boardwalk", lighting: "sunset, warm and cool light mix" },
    { background: "coral beach, pink sand, turquoise water", lighting: "low sun, magic hour glow" },
  ],
  "cafe": [
    { background: "Parisian cafe, marble tables, iron chairs", lighting: "soft light through window" },
    { background: "modern coffee shop, concrete and wood", lighting: "pendant lamps, morning sun ray" },
    { background: "vintage cafe, burgundy velvet sofas", lighting: "warm table lamp glow, dim depth" },
    { background: "bookshop cafe, shelves to ceiling", lighting: "cozy evening lamp light" },
    { background: "summer terrace, wicker furniture, vines", lighting: "sun spots through grape leaves" },
    { background: "Scandinavian cafe, white walls, light oak", lighting: "soft diffused window light" },
    { background: "basement cafe, brick vaults, candles", lighting: "warm amber candlelight" },
    { background: "Japanese cafe, shoji screens, bamboo", lighting: "soft filtered rice paper light" },
    { background: "rooftop cafe, city view, glass railings", lighting: "sunset side-lighting" },
    { background: "Italian trattoria, checkered tablecloths", lighting: "copper lamp glow, warm evening" },
  ],
  "nature": [
    { background: "forest clearing, morning mist over grass", lighting: "god rays through foliage" },
    { background: "alpine meadow, colorful flowers, mountains", lighting: "bright sun, long stone shadows" },
    { background: "autumn lakeside, tree reflections in water", lighting: "warm sunset orange light" },
    { background: "bamboo grove, vertical trunks", lighting: "sun flicker, graphic shadow pattern" },
    { background: "lavender field, purple blossoms to horizon", lighting: "high sun, saturated colors" },
    { background: "rock canyon, narrow trail", lighting: "contrast light and deep shadow" },
    { background: "birch grove in spring, young leaves", lighting: "greenish tint, soft diffused light" },
    { background: "tropical waterfall, jungle, water mist", lighting: "sun rays through mist, rainbow" },
    { background: "steppe, tall grass waves in wind", lighting: "low sun, long tree shadows" },
    { background: "mountain river, crystal clear water, pines", lighting: "sun sparkle, cold blue accents" },
  ],
  "loft": [
    { background: "brick loft, exposed beams, big window", lighting: "angled sunlight, long shadows" },
    { background: "concrete loft, metal ceiling pipes", lighting: "spot light pools, cold temperature" },
    { background: "loft studio, panoramic sunset windows", lighting: "warm orange light, silhouettes" },
    { background: "loft, wooden beams, dark oak parquet", lighting: "warm floor lamp, soft shadows" },
    { background: "minimalist loft, white walls, black metal", lighting: "diffused window light, geometric shadows" },
    { background: "loft, exposed brick, graffiti wall", lighting: "industrial lamps, warm-cold contrast" },
    { background: "loft, high ceilings, glass mezzanine", lighting: "light through glass roof" },
    { background: "warehouse loft, worn wooden floors", lighting: "single window light pool, dim space" },
    { background: "loft, white brick, copper pipes", lighting: "Edison lamp warm glow" },
    { background: "loft, panoramic night city view", lighting: "blue-tinted street light reflections" },
  ],
};

/**
 * Получает случайный вариант локации (фон + освещение)
 */
function getRandomLocationVariant(location: string): LocationData | null {
  const variants = locationVariants[location];
  if (!variants || variants.length === 0) return null;
  return variants[Math.floor(Math.random() * variants.length)];
}

// Обратная совместимость: locationData через случайный выбор
const locationData: Record<string, LocationData> = new Proxy({} as Record<string, LocationData>, {
  get(_, prop: string) {
    return getRandomLocationVariant(prop) || undefined;
  },
  has(_, prop: string) {
    return prop in locationVariants;
  },
});

// 5 студийных фонов для случайного выбора
const studioBackgrounds: string[] = [
  "smooth light lavender gradient background, soft even lighting",
  "smooth warm beige-cream gradient background, diffused lighting",
  "smooth soft ivory gradient background, natural soft lighting",
  "smooth warm powder pink gradient background, soft even lighting",
  "smooth pale sage green gradient background, soft even lighting"
];

function getRandomStudioBackground(): string {
  return studioBackgrounds[Math.floor(Math.random() * studioBackgrounds.length)];
}


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

  return `Replace all clothing with ${clothing}. ${studio}. Keep face unchanged`;
}

/**
 * Шаблон 2: Стиль + Локация
 */
function buildPromptStyleLocation(style: string, location: string, gender?: string): string {
  const clothing = getClothingForStyle(style, gender);
  const loc = locationData[location];

  if (!loc) return buildPromptStyleOnly(style, gender);

  return `Replace all clothing with ${clothing}. Background: ${loc.background}, ${loc.lighting}. Keep face unchanged`;
}

/**
 * Шаблон 3: Пользовательское описание одежды
 */
function buildPromptCustom(customOutfit: string, location?: string): string {
  const hasLocation = location && location !== "studio";

  let prompt = `Replace all clothing with ${customOutfit}.`;

  // Добавляем фон (локация или студия)
  if (hasLocation) {
    const loc = locationData[location!];
    if (loc) {
      prompt += ` Background: ${loc.background}, ${loc.lighting}.`;
    }
  } else {
    const studio = getRandomStudioBackground();
    prompt += ` ${studio}.`;
  }

  prompt += ` Keep face unchanged`;

  return prompt;
}

/**
 * Главная функция выбора шаблона
 */
function buildPrompt(style: string, location?: string, customOutfit?: string, gender?: string): string {
  // Шаблон 3: Пользовательское описание одежды (приоритет)
  if (customOutfit) {
    console.log("Template 3: Custom outfit text");
    return buildPromptCustom(customOutfit, location);
  }

  const hasLocation = location && location !== "studio";

  // Шаблон 2: Стиль + Локация
  if (hasLocation) {
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
const premiumLocations = ["city-night", "boutique", "beach", "cafe", "nature", "loft"];

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
    const { image, style, location, gender, customOutfit } = body;

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
      console.log("Custom outfit:", customOutfit, "| Location:", location || "studio (default)");
    } else {
      console.log("Style:", style, "| Location:", location || "studio (default)");
    }

    // Собираем промпт через систему из 3 шаблонов
    // Шаблон 1: Только стиль (студийный фон - случайный из 5)
    // Шаблон 2: Стиль + Локация (не studio)
    // Шаблон 3: Пользовательское описание одежды (приоритет)
    const fullPrompt = buildPrompt(style || "", location, customOutfit, gender);

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
          // Критические параметры для сохранения лица и фигуры:
          image_to_image_strength: 0.5,  // 0.5 = баланс сохранения лица и смены одежды
          cfg_scale: 2.0,                // Ниже = мягче интерпретирует промпт, не перерисовывает
          num_inference_steps: 32,       // Чуть выше = стабильнее результат
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
