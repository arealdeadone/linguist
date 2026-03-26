import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { MODEL_ROUTING } from '../src/lib/constants';
import {
	languages,
	learners,
	lessons,
	modelRouting,
	tutorPrompts,
	vocabulary
} from '../src/lib/server/schema';
import type { LessonPlan } from '../src/lib/types/lesson';
import type { TaskType } from '../src/lib/types/ai';
import {
	HI_TUTOR_PROMPT_SECTIONS,
	TH_TUTOR_PROMPT_SECTIONS
} from '../src/lib/server/prompts/seed-prompts';

function loadEnv() {
	const envFiles = ['.env.local', '.env'];
	for (const file of envFiles) {
		try {
			const content = readFileSync(file, 'utf-8');
			for (const line of content.split('\n')) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue;
				const eqIdx = trimmed.indexOf('=');
				if (eqIdx === -1) continue;
				const key = trimmed.slice(0, eqIdx);
				const val = trimmed.slice(eqIdx + 1);
				if (!process.env[key]) process.env[key] = val;
			}
			break;
		} catch {
			continue;
		}
	}
}

loadEnv();

const databaseUrl =
	process.env.DATABASE_URL ?? 'postgresql://linguist:linguist@localhost:5433/linguist';
const client = postgres(databaseUrl);
const db = drizzle(client);

const zhWords = [
	{
		word: '你好',
		romanization: 'nǐ hǎo',
		meaning: 'नमस्ते',
		sceneDescription: 'सुबह का समय, आप किसी दोस्त से मिलते हैं, मुस्कुराते हुए हाथ हिलाते हैं।'
	},
	{
		word: '谢谢',
		romanization: 'xiè xie',
		meaning: 'धन्यवाद',
		sceneDescription: 'किसी ने आपको चाय दी, आप सिर झुकाकर शुक्रिया कहते हैं।'
	},
	{
		word: '再见',
		romanization: 'zài jiàn',
		meaning: 'फिर मिलेंगे',
		sceneDescription: 'दोस्त जा रहा है, आप दरवाज़े पर खड़े होकर हाथ हिलाते हैं।'
	},
	{
		word: '是',
		romanization: 'shì',
		meaning: 'हाँ / है',
		sceneDescription: 'कोई पूछता है "क्या यह सही है?" आप सिर हिलाकर हामी भरते हैं।'
	},
	{
		word: '不',
		romanization: 'bù',
		meaning: 'नहीं',
		sceneDescription: 'कोई और चावल देना चाहता है, आप हाथ हिलाकर मना करते हैं।'
	},
	{
		word: '我',
		romanization: 'wǒ',
		meaning: 'मैं',
		sceneDescription: 'आप अपनी छाती की ओर इशारा करते हैं — "यह मैं हूँ!"'
	},
	{
		word: '你',
		romanization: 'nǐ',
		meaning: 'तुम',
		sceneDescription: 'आप सामने वाले व्यक्ति की ओर उंगली से इशारा करते हैं।'
	},
	{
		word: '他',
		romanization: 'tā',
		meaning: 'वह (पुरुष)',
		sceneDescription: 'एक लड़का दूर खड़ा है, आप उसकी तरफ इशारा करते हैं।'
	},
	{
		word: '她',
		romanization: 'tā',
		meaning: 'वह (स्त्री)',
		sceneDescription: 'एक लड़की बगीचे में फूल तोड़ रही है, आप उसे दिखाते हैं।'
	},
	{
		word: '吃',
		romanization: 'chī',
		meaning: 'खाना',
		sceneDescription: 'गरमागरम चावल की प्लेट, चॉपस्टिक्स उठाकर मुँह में डालते हैं। स्वादिष्ट!'
	},
	{
		word: '喝',
		romanization: 'hē',
		meaning: 'पीना',
		sceneDescription: 'गर्म चाय का कप, भाप उठ रही है, धीरे-धीरे एक घूंट लेते हैं।'
	},
	{
		word: '水',
		romanization: 'shuǐ',
		meaning: 'पानी',
		sceneDescription: 'गर्मी का दिन, ठंडे पानी का गिलास — पहला घूंट लेते ही राहत मिलती है।'
	},
	{
		word: '饭',
		romanization: 'fàn',
		meaning: 'चावल / खाना',
		sceneDescription: 'रसोई से चावल पकने की खुशबू आ रही है, बड़ा सा कटोरा भरा हुआ है।'
	},
	{
		word: '好',
		romanization: 'hǎo',
		meaning: 'अच्छा',
		sceneDescription: 'खाना चखकर अंगूठा दिखाते हैं — "बहुत अच्छा!"'
	},
	{
		word: '大',
		romanization: 'dà',
		meaning: 'बड़ा',
		sceneDescription: 'एक विशाल तरबूज़ — दोनों हाथों से उठाना पड़ता है!'
	},
	{
		word: '小',
		romanization: 'xiǎo',
		meaning: 'छोटा',
		sceneDescription: 'हथेली पर एक छोटी सी चींटी चल रही है, बहुत नन्ही।'
	},
	{
		word: '多少',
		romanization: 'duō shao',
		meaning: 'कितना',
		sceneDescription: 'बाज़ार में फल देखकर दुकानदार से पूछते हैं — "कितने का है?"'
	},
	{
		word: '钱',
		romanization: 'qián',
		meaning: 'पैसे',
		sceneDescription: 'जेब से सिक्के निकालते हैं, गिनते हैं, दुकानदार को देते हैं।'
	},
	{
		word: '一',
		romanization: 'yī',
		meaning: 'एक',
		sceneDescription: 'एक उंगली ऊपर उठाते हैं — सिर्फ़ एक!'
	},
	{
		word: '二',
		romanization: 'èr',
		meaning: 'दो',
		sceneDescription: 'दो उंगलियाँ दिखाते हैं — शांति का चिन्ह जैसा।'
	}
];

const teWords = [
	{
		word: 'నమస్కారం',
		romanization: 'namaskāram',
		meaning: 'สวัสดี',
		sceneDescription: 'เช้าวันใหม่ คุณพบเพื่อน ยกมือไหว้ทักทายด้วยรอยยิ้ม'
	},
	{
		word: 'ధన్యవాదాలు',
		romanization: 'dhanyavādālu',
		meaning: 'ขอบคุณ',
		sceneDescription: 'มีคนยื่นน้ำให้ คุณรับมาก้มหัวขอบคุณ'
	},
	{
		word: 'మంచి',
		romanization: 'manchi',
		meaning: 'ดี',
		sceneDescription: 'ลองชิมอาหาร อร่อยมาก! ยกนิ้วโป้งขึ้น'
	},
	{
		word: 'నేను',
		romanization: 'nēnu',
		meaning: 'ฉัน',
		sceneDescription: 'คุณชี้มือไปที่หน้าอกตัวเอง — "นี่คือฉัน!"'
	},
	{
		word: 'నీవు',
		romanization: 'nīvu',
		meaning: 'คุณ',
		sceneDescription: 'คุณชี้ไปที่คนตรงข้าม — "คุณไง!"'
	},
	{
		word: 'అతడు',
		romanization: 'ataḍu',
		meaning: 'เขา (ผู้ชาย)',
		sceneDescription: 'เด็กผู้ชายยืนอยู่ไกลๆ คุณชี้ไปที่เขา'
	},
	{
		word: 'ఆమె',
		romanization: 'āme',
		meaning: 'เธอ (ผู้หญิง)',
		sceneDescription: 'ผู้หญิงกำลังเก็บดอกไม้ในสวน คุณชี้ให้ดู'
	},
	{
		word: 'తిను',
		romanization: 'tinu',
		meaning: 'กิน',
		sceneDescription: 'จานข้าวร้อนๆ หยิบขึ้นมาใส่ปาก — อร่อย!'
	},
	{
		word: 'తాగు',
		romanization: 'tāgu',
		meaning: 'ดื่ม',
		sceneDescription: 'แก้วชาร้อน ไอน้ำลอยขึ้น ยกขึ้นจิบช้าๆ'
	},
	{
		word: 'నీళ్ళు',
		romanization: 'nīḷḷu',
		meaning: 'น้ำ',
		sceneDescription: 'วันร้อนจัด หยิบแก้วน้ำเย็น ดื่มแล้วรู้สึกสดชื่น'
	},
	{
		word: 'అన్నం',
		romanization: 'annam',
		meaning: 'ข้าว',
		sceneDescription: 'กลิ่นข้าวหุงจากครัว ชามใหญ่เต็มไปด้วยข้าวสวยร้อนๆ'
	},
	{
		word: 'బాగుంది',
		romanization: 'bāgundi',
		meaning: 'ดีมาก',
		sceneDescription: 'เพื่อนถามว่าเป็นไงบ้าง คุณยิ้มตอบ — ดีมาก!'
	},
	{
		word: 'పెద్ద',
		romanization: 'pedda',
		meaning: 'ใหญ่',
		sceneDescription: 'แตงโมลูกยักษ์ — ต้องใช้สองมือยก!'
	},
	{
		word: 'చిన్న',
		romanization: 'chinna',
		meaning: 'เล็ก',
		sceneDescription: 'มดตัวเล็กๆ เดินอยู่บนฝ่ามือ ตัวจิ๋วมาก'
	},
	{
		word: 'ఎంత',
		romanization: 'enta',
		meaning: 'เท่าไหร่',
		sceneDescription: 'ในตลาด เห็นผลไม้สวยๆ ถามคนขาย — "เท่าไหร่?"'
	},
	{
		word: 'డబ్బు',
		romanization: 'ḍabbu',
		meaning: 'เงิน',
		sceneDescription: 'ล้วงเหรียญจากกระเป๋า นับแล้วยื่นให้คนขาย'
	},
	{
		word: 'ఒకటి',
		romanization: 'okaṭi',
		meaning: 'หนึ่ง',
		sceneDescription: 'ชูนิ้วขึ้นหนึ่งนิ้ว — แค่หนึ่ง!'
	},
	{
		word: 'రెండు',
		romanization: 'reṇḍu',
		meaning: 'สอง',
		sceneDescription: 'ชูสองนิ้ว — เหมือนสัญลักษณ์สันติภาพ'
	},
	{
		word: 'ఇల్లు',
		romanization: 'illu',
		meaning: 'บ้าน',
		sceneDescription: 'หลังเลิกงาน เปิดประตูบ้าน กลิ่นอาหารลอยมา รู้สึกอบอุ่น'
	},
	{
		word: 'వెళ్ళు',
		romanization: 'veḷḷu',
		meaning: 'ไป',
		sceneDescription: 'หยิบกระเป๋า เดินออกจากบ้าน ก้าวเท้าออกไปข้างนอก'
	}
];

const zhLessonPlan: LessonPlan = {
	id: crypto.randomUUID(),
	cefr_level: 'A1',
	week: 1,
	day: 1,
	theme: 'अभिवादन और बुनियादी बातें',
	duration_minutes: 25,
	learning_objectives: [
		'विनम्रता से अभिवादन करना सीखें',
		'सर्वनामों का प्रयोग करें',
		'सरल मात्रा के सवाल पूछें'
	],
	vocabulary_targets: [
		{
			word: '你好',
			romanization: 'nǐ hǎo',
			meaning: 'नमस्ते',
			scene_description: 'सुबह का समय, आप किसी दोस्त से मिलते हैं, मुस्कुराते हुए हाथ हिलाते हैं।'
		},
		{
			word: '谢谢',
			romanization: 'xiè xie',
			meaning: 'धन्यवाद',
			scene_description: 'किसी ने आपको चाय दी, आप सिर झुकाकर शुक्रिया कहते हैं।'
		},
		{
			word: '再见',
			romanization: 'zài jiàn',
			meaning: 'फिर मिलेंगे',
			scene_description: 'दोस्त जा रहा है, आप दरवाज़े पर खड़े होकर हाथ हिलाते हैं।'
		},
		{
			word: '多少',
			romanization: 'duō shao',
			meaning: 'कितना',
			scene_description: 'बाज़ार में फल देखकर दुकानदार से पूछते हैं — "कितने का है?"'
		},
		{
			word: '钱',
			romanization: 'qián',
			meaning: 'पैसे',
			scene_description: 'जेब से सिक्के निकालते हैं, गिनते हैं, दुकानदार को देते हैं।'
		}
	],
	review_words: ['我', '你', '好'],
	activities: [
		{ type: 'listening', duration_min: 5 },
		{ type: 'vocabulary_tpr', duration_min: 7 },
		{ type: 'conversation', duration_min: 8 },
		{ type: 'quiz', duration_min: 5 }
	],
	colloquial_phrase: '慢慢来 (màn màn lái) - धीरे-धीरे करो, जल्दी मत करो',
	cultural_note: 'चीन में पहली मुलाकात में विनम्र मुस्कान और छोटा अभिवादन आम है।'
};

const teLessonPlan: LessonPlan = {
	id: crypto.randomUUID(),
	cefr_level: 'A1',
	week: 1,
	day: 1,
	theme: 'การแนะนำตัวและคำศัพท์ประจำวัน',
	duration_minutes: 25,
	learning_objectives: ['แนะนำตัวเองได้', 'จำคำกริยาที่ใช้ในชีวิตประจำวัน', 'ใช้ตัวเลขพื้นฐาน'],
	vocabulary_targets: [
		{
			word: 'నమస్కారం',
			romanization: 'namaskāram',
			meaning: 'สวัสดี',
			scene_description: 'เช้าวันใหม่ คุณพบเพื่อน ยกมือไหว้ทักทายด้วยรอยยิ้ม'
		},
		{
			word: 'ధన్యవాదాలు',
			romanization: 'dhanyavādālu',
			meaning: 'ขอบคุณ',
			scene_description: 'มีคนยื่นน้ำให้ คุณรับมาก้มหัวขอบคุณ'
		},
		{
			word: 'నేను',
			romanization: 'nēnu',
			meaning: 'ฉัน',
			scene_description: 'คุณชี้มือไปที่หน้าอกตัวเอง — "นี่คือฉัน!"'
		},
		{
			word: 'నీవు',
			romanization: 'nīvu',
			meaning: 'คุณ',
			scene_description: 'คุณชี้ไปที่คนตรงข้าม — "คุณไง!"'
		},
		{
			word: 'ఒకటి',
			romanization: 'okaṭi',
			meaning: 'หนึ่ง',
			scene_description: 'ชูนิ้วขึ้นหนึ่งนิ้ว — แค่หนึ่ง!'
		}
	],
	review_words: ['మంచి', 'ఎంత', 'డబ్బు'],
	activities: [
		{ type: 'listening', duration_min: 5 },
		{ type: 'speaking', duration_min: 7 },
		{ type: 'conversation', duration_min: 8 },
		{ type: 'quiz', duration_min: 5 }
	],
	colloquial_phrase: 'పర్లేదు (parlēdu) - ไม่เป็นไร ไม่มีปัญหา',
	cultural_note: 'ในภาษาเตลูกู การใช้คำทักทายจะแตกต่างกันตามอายุและความสัมพันธ์'
};

function toPlanRecord(plan: LessonPlan): Record<string, unknown> {
	return plan as unknown as Record<string, unknown>;
}

function buildRoutingValues(language: 'zh' | 'te') {
	const tasks = Object.keys(MODEL_ROUTING) as TaskType[];
	return tasks.map((task) => ({
		language,
		task,
		model: MODEL_ROUTING[task][language]
	}));
}

async function seed() {
	console.log('🌱 Seeding database...');

	await db.execute(sql`
		TRUNCATE TABLE
			languages,
			model_routing,
			tutor_prompts,
			quiz_results,
			code_switches,
			conversations,
			lessons,
			vocabulary,
			learners
		RESTART IDENTITY CASCADE
	`);

	await db
		.insert(languages)
		.values([
			{ code: 'zh', name: 'Chinese Mandarin' },
			{ code: 'te', name: 'Telugu' },
			{ code: 'hi', name: 'Hindi' },
			{ code: 'th', name: 'Thai' },
			{ code: 'en', name: 'English' }
		])
		.onConflictDoUpdate({
			target: languages.code,
			set: {
				name: sql`excluded.name`
			}
		});

	const [arachuri] = await db
		.insert(learners)
		.values({
			name: 'Arvind',
			pin: '****',
			targetLanguage: 'zh',
			lessonLanguage: 'hi',
			cefrLevel: 'A1',
			preferences: {}
		})
		.returning({ id: learners.id });

	const [student] = await db
		.insert(learners)
		.values({
			name: 'อุ้ม',
			pin: '****',
			targetLanguage: 'te',
			lessonLanguage: 'th',
			cefrLevel: 'A1',
			preferences: {}
		})
		.returning({ id: learners.id });

	const zhVocab = zhWords.map((entry) => ({
		learnerId: arachuri.id,
		word: entry.word,
		romanization: entry.romanization,
		meaning: entry.meaning,
		sceneDescription: entry.sceneDescription,
		cefrLevel: 'A1',
		sm2Repetition: 0,
		sm2Interval: 0,
		sm2Ef: 2.5,
		modalityScores: { listening: 0, speaking: 0, contextual: 0 }
	}));

	const teVocab = teWords.map((entry) => ({
		learnerId: student.id,
		word: entry.word,
		romanization: entry.romanization,
		meaning: entry.meaning,
		sceneDescription: entry.sceneDescription,
		cefrLevel: 'A1',
		sm2Repetition: 0,
		sm2Interval: 0,
		sm2Ef: 2.5,
		modalityScores: { listening: 0, speaking: 0, contextual: 0 }
	}));

	await db.insert(vocabulary).values([...zhVocab, ...teVocab]);

	await db
		.insert(modelRouting)
		.values([...buildRoutingValues('zh'), ...buildRoutingValues('te')])
		.onConflictDoUpdate({
			target: [modelRouting.language, modelRouting.task],
			set: {
				model: sql`excluded.model`
			}
		});

	await db.insert(tutorPrompts).values([
		{
			language: 'hi',
			sections: HI_TUTOR_PROMPT_SECTIONS
		},
		{
			language: 'th',
			sections: TH_TUTOR_PROMPT_SECTIONS
		}
	]);

	await db.insert(lessons).values([
		{
			learnerId: arachuri.id,
			cefrLevel: 'A1',
			week: 1,
			day: 1,
			theme: zhLessonPlan.theme,
			plan: toPlanRecord(zhLessonPlan),
			status: 'pending'
		},
		{
			learnerId: student.id,
			cefrLevel: 'A1',
			week: 1,
			day: 1,
			theme: teLessonPlan.theme,
			plan: toPlanRecord(teLessonPlan),
			status: 'pending'
		}
	]);

	console.log('✅ Seed complete');
	console.log(`Inserted learners: 2`);
	console.log('Inserted languages: 5');
	console.log(`Inserted vocabulary rows: ${zhWords.length + teWords.length}`);
	console.log('Inserted model routing rows: 14');
	console.log('Inserted tutor prompts: 2');
	console.log('Inserted lessons: 2');
}

seed()
	.catch((error: unknown) => {
		console.error('❌ Seed failed');
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await client.end();
	});
