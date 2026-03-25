import type { CefrLevel } from '../types/lesson';
import type { Scenario } from '../types/scenario';

export const scenarios: Scenario[] = [
	{
		id: 'zh-a1-market-shopping',
		title: 'सब्ज़ी बाज़ार में खरीदारी',
		description:
			'आप स्थानीय बाज़ार में फल और सब्ज़ियाँ खरीद रहे हैं। दाम पूछकर मोलभाव करते हुए छोटी बातचीत करें।',
		cefrLevel: 'A1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a friendly market vendor in a Chinese-speaking neighborhood. Help the learner practice basic buying phrases, asking prices, quantities, and polite closings at A1 level.',
		suggestedVocab: ['买', '卖', '多少钱', '便宜', '新鲜', '公斤']
	},
	{
		id: 'zh-a1-ordering-food',
		title: 'रेस्टोरेंट में खाना ऑर्डर करना',
		description:
			'आप एक छोटे रेस्टोरेंट में खाना ऑर्डर कर रहे हैं। पसंद और मात्रा के बारे में सरल वाक्यों में बात करें।',
		cefrLevel: 'A1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a restaurant server taking an order in Mandarin. Guide the learner through choosing dishes, asking for spice level, and confirming the order with short A1 exchanges.',
		suggestedVocab: ['菜单', '点菜', '米饭', '面条', '辣', '不要']
	},
	{
		id: 'zh-a1-greeting-neighbors',
		title: 'पड़ोसियों का अभिवादन',
		description:
			'आप अपने नए पड़ोसी से पहली बार मिलते हैं। नाम, घर और दिनचर्या पर विनम्र परिचय दें।',
		cefrLevel: 'A1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a new neighbor meeting the learner in the apartment hallway. Keep the conversation simple and warm, focusing on greetings, self-introduction, and basic personal details.',
		suggestedVocab: ['你好', '早上好', '住在', '附近', '一起', '再见']
	},
	{
		id: 'zh-a1-asking-directions',
		title: 'रास्ता पूछना',
		description:
			'आपको पास के स्थान तक पहुँचना है और राहगीर से दिशा पूछनी है। बाएँ-दाएँ और सीधा जैसे शब्दों का अभ्यास करें।',
		cefrLevel: 'A1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a passerby giving simple directions in Mandarin. Encourage the learner to ask where a place is and understand step-by-step directions using basic location words.',
		suggestedVocab: ['请问', '怎么走', '左边', '右边', '直走', '路口']
	},
	{
		id: 'zh-a1-counting-numbers',
		title: 'गिनती और कीमत बताना',
		description:
			'आप दुकान में चीज़ों की संख्या और कीमत बोलने का अभ्यास कर रहे हैं। संख्याओं और पैसों के छोटे वाक्य बनाइए।',
		cefrLevel: 'A1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a cashier helping the learner practice Mandarin numbers and money expressions. Ask short questions that require counting items and stating total prices.',
		suggestedVocab: ['一', '二', '三', '十', '百', '块']
	},
	{
		id: 'zh-a2-doctor-visit',
		title: 'डॉक्टर के क्लिनिक की मुलाक़ात',
		description:
			'आप डॉक्टर को अपनी तकलीफ़ बताते हैं और सलाह लेते हैं। लक्षण, समय और दवा के बारे में स्पष्ट उत्तर दें।',
		cefrLevel: 'A2',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a clinic doctor speaking Mandarin. Ask about symptoms, duration, and daily habits, then provide simple follow-up recommendations suitable for A2 practice.',
		suggestedVocab: ['头痛', '发烧', '咳嗽', '药', '预约', '休息']
	},
	{
		id: 'zh-a2-phone-call',
		title: 'फ़ोन पर समय तय करना',
		description:
			'आप किसी मित्र या सहकर्मी से फ़ोन पर मिलने का समय तय करते हैं। उपलब्धता, तारीख़ और समय पर बात करें।',
		cefrLevel: 'A2',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a friend coordinating plans over a phone call in Mandarin. Help the learner practice confirming dates, times, and alternatives with natural A2 turn-taking.',
		suggestedVocab: ['喂', '有空', '明天', '时间', '可以', '见面']
	},
	{
		id: 'zh-a2-hotel-check-in',
		title: 'होटल में चेक-इन',
		description:
			'आप यात्रा के दौरान होटल पहुँचते हैं और चेक-इन प्रक्रिया पूरी करते हैं। कमरा, पहचान और सुविधाओं के बारे में पूछें।',
		cefrLevel: 'A2',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a hotel front-desk agent in Mandarin. Conduct a realistic check-in dialogue including reservation details, room preferences, and basic hotel policies.',
		suggestedVocab: ['预订', '护照', '房间', '几晚', '钥匙', '早餐']
	},
	{
		id: 'zh-a2-restaurant-review',
		title: 'रेस्टोरेंट की समीक्षा बताना',
		description:
			'आप हाल ही में खाए गए भोजन का अनुभव साझा करते हैं। स्वाद, सेवा और माहौल पर अपनी राय दें।',
		cefrLevel: 'A2',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a friend asking for a restaurant recommendation in Mandarin. Prompt the learner to describe food quality, service, and value with connected A2 sentences.',
		suggestedVocab: ['味道', '服务', '环境', '推荐', '价格', '满意']
	},
	{
		id: 'zh-a2-birthday-party',
		title: 'जन्मदिन पार्टी की योजना',
		description:
			'आप एक जन्मदिन पार्टी की योजना बना रहे हैं। मेहमान, समय, जगह और तैयारी पर चर्चा करें।',
		cefrLevel: 'A2',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a close friend co-planning a birthday party in Mandarin. Encourage practical discussion about invitations, supplies, and schedule using A2-level language.',
		suggestedVocab: ['生日', '蛋糕', '礼物', '邀请', '朋友', '庆祝']
	},
	{
		id: 'zh-b1-job-interview',
		title: 'नौकरी का इंटरव्यू',
		description:
			'आप एक पद के लिए इंटरव्यू दे रहे हैं। अपने अनुभव, कौशल और काम के लक्ष्यों को उदाहरणों सहित समझाएँ।',
		cefrLevel: 'B1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are an interviewer for an entry-level office role. Ask follow-up questions in Mandarin about past experience, strengths, and teamwork so the learner can produce B1-length responses.',
		suggestedVocab: ['简历', '经验', '负责', '优点', '团队', '机会']
	},
	{
		id: 'zh-b1-apartment-rental',
		title: 'किराए पर अपार्टमेंट देखना',
		description:
			'आप नया अपार्टमेंट किराए पर लेना चाहते हैं। किराया, नियम और सुविधाओं पर विस्तार से पूछताछ करें।',
		cefrLevel: 'B1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a landlord showing an apartment. Run a realistic B1 conversation in Mandarin covering rent terms, contract details, location benefits, and negotiation points.',
		suggestedVocab: ['房租', '押金', '家具', '地铁', '合同', '看房']
	},
	{
		id: 'zh-b1-travel-planning',
		title: 'यात्रा की योजना बनाना',
		description:
			'आप दोस्तों के साथ यात्रा की योजना बना रहे हैं। बजट, कार्यक्रम और पसंद के आधार पर निर्णय लें।',
		cefrLevel: 'B1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a travel partner planning a multi-day trip. Ask the learner to compare options and justify choices in Mandarin, targeting B1 fluency and coherence.',
		suggestedVocab: ['行程', '机票', '预算', '景点', '预订', '出发']
	},
	{
		id: 'zh-b1-cooking-class',
		title: 'कुकिंग क्लास में बातचीत',
		description:
			'आप कुकिंग क्लास में नई डिश सीख रहे हैं। सामग्री, चरण और स्वाद पर चर्चा करके निर्देश स्पष्ट करें।',
		cefrLevel: 'B1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a cooking instructor teaching a popular dish in Mandarin. Prompt the learner to ask clarifying questions and describe process steps in structured B1 language.',
		suggestedVocab: ['食材', '步骤', '切', '煮', '尝', '技巧']
	},
	{
		id: 'zh-b1-food-debate',
		title: 'खाने की आदतों पर बहस',
		description:
			'आप स्वस्थ भोजन और फास्ट फूड पर अपने विचार रखते हैं। उदाहरण देकर अपनी राय का समर्थन करें और दूसरे पक्ष को जवाब दें।',
		cefrLevel: 'B1',
		targetLanguage: 'zh',
		systemPromptContext:
			'You are a discussion partner in a casual debate about food choices. Encourage argumentation, agreement/disagreement, and reasoned examples in Mandarin at B1 level.',
		suggestedVocab: ['健康', '油炸', '素食', '营养', '观点', '同意']
	},
	{
		id: 'te-a1-market-shopping',
		title: 'ซื้อของที่ตลาด',
		description: 'คุณไปตลาดเพื่อซื้อของใช้และอาหารสด พูดคุยเรื่องราคาและจำนวนแบบง่าย ๆ',
		cefrLevel: 'A1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a market seller speaking Telugu. Help the learner practice simple shopping dialogue: asking prices, quantities, and confirming purchases at A1 level.',
		suggestedVocab: ['మార్కెట్', 'ధర', 'కూరగాయలు', 'తక్కువ', 'కొలత', 'డబ్బు']
	},
	{
		id: 'te-a1-greeting-elders',
		title: 'ทักทายผู้ใหญ่',
		description:
			'คุณพบญาติผู้ใหญ่และต้องทักทายอย่างสุภาพ ฝึกคำทักทายและประโยคง่าย ๆ ในชีวิตประจำวัน',
		cefrLevel: 'A1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are an elder family member in a Telugu-speaking home. Guide the learner through respectful greetings and polite small talk suitable for A1 beginners.',
		suggestedVocab: ['నమస్తే', 'పెద్దలు', 'ఆశీర్వాదం', 'ఎలా ఉన్నారు', 'రండి', 'కూర్చోండి']
	},
	{
		id: 'te-a1-ordering-tea',
		title: 'สั่งชา',
		description: 'คุณอยู่ที่ร้านน้ำชาและต้องสั่งเครื่องดื่ม บอกความหวานและจำนวนที่ต้องการให้ชัดเจน',
		cefrLevel: 'A1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a tea stall worker taking orders in Telugu. Keep turns short and clear while the learner practices ordering drinks and making small preference requests.',
		suggestedVocab: ['చాయ్', 'పాలు', 'చక్కెర', 'వేడి', 'ఇంకో కప్పు', 'బిల్లు']
	},
	{
		id: 'te-a1-asking-help',
		title: 'ขอความช่วยเหลือ',
		description: 'คุณต้องการความช่วยเหลือในที่สาธารณะ ถามคำถามสั้น ๆ และตอบกลับอย่างสุภาพ',
		cefrLevel: 'A1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a helpful local person. Support the learner in using basic Telugu for requesting help, clarifying simple problems, and expressing thanks.',
		suggestedVocab: ['సహాయం', 'దయచేసి', 'సమస్య', 'ఎక్కడ', 'చూపించండి', 'ధన్యవాదాలు']
	},
	{
		id: 'te-a1-family-introductions',
		title: 'แนะนำสมาชิกครอบครัว',
		description: 'คุณแนะนำสมาชิกในครอบครัวให้เพื่อนรู้จัก ฝึกบอกความสัมพันธ์และข้อมูลพื้นฐาน',
		cefrLevel: 'A1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a new friend meeting the learner and their family. Encourage simple Telugu introductions using kinship words, names, and short personal details.',
		suggestedVocab: ['నాన్న', 'అమ్మ', 'అన్న', 'చెల్లి', 'మా కుటుంబం', 'పరిచయం']
	},
	{
		id: 'te-a2-doctor-visit',
		title: 'พบแพทย์',
		description: 'คุณไปพบแพทย์และอธิบายอาการของตนเอง ตอบคำถามเรื่องระยะเวลาและการดูแลตัวเอง',
		cefrLevel: 'A2',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a doctor in a clinic speaking Telugu. Ask symptom-focused questions and give practical advice so the learner can handle a typical A2 medical conversation.',
		suggestedVocab: ['జ్వరం', 'నొప్పి', 'మందు', 'పరీక్ష', 'అపాయింట్మెంట్', 'విశ్రాంతి']
	},
	{
		id: 'te-a2-bus-travel',
		title: 'เดินทางด้วยรถบัส',
		description: 'คุณต้องขึ้นรถบัสไปอีกเมืองหนึ่ง ถามเรื่องเส้นทาง เวลา และจุดลงรถให้ถูกต้อง',
		cefrLevel: 'A2',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a bus conductor helping a passenger in Telugu. Practice ticket buying, stop confirmation, travel duration, and polite travel questions at A2 level.',
		suggestedVocab: ['బస్సు', 'టికెట్', 'స్టాప్', 'ఎక్కండి', 'దిగండి', 'సమయం']
	},
	{
		id: 'te-a2-festival-preparation',
		title: 'เตรียมงานเทศกาล',
		description: 'ครอบครัวของคุณกำลังเตรียมงานเทศกาล ช่วยกันวางแผนสิ่งที่ต้องซื้อและสิ่งที่ต้องทำ',
		cefrLevel: 'A2',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a family member preparing for a local festival. Guide the learner in Telugu through planning tasks, shopping lists, and role assignments using A2 structures.',
		suggestedVocab: ['పండుగ', 'అలంకారం', 'స్వీట్లు', 'అతిథులు', 'సిద్ధం', 'కొనుగోలు']
	},
	{
		id: 'te-a2-phone-call',
		title: 'คุยโทรศัพท์นัดหมาย',
		description: 'คุณโทรหาเพื่อนเพื่อเลื่อนหรือนัดเวลาใหม่ ยืนยันวันเวลาและส่งข้อความติดตาม',
		cefrLevel: 'A2',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a friend on a phone call in Telugu. Create a realistic scheduling conversation where the learner proposes times, handles conflicts, and confirms plans.',
		suggestedVocab: ['హలో', 'మాట్లాడవచ్చా', 'తర్వాత', 'సందేశం', 'కాల్', 'కలుద్దాం']
	},
	{
		id: 'te-a2-restaurant',
		title: 'สั่งอาหารที่ร้านอาหาร',
		description: 'คุณไปทานอาหารที่ร้านและต้องสั่งเมนูหลัก พูดคุยเรื่องรสชาติและความต้องการพิเศษ',
		cefrLevel: 'A2',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a restaurant waiter speaking Telugu. Help the learner practice A2-level ordering, dietary preferences, and asking for the bill naturally.',
		suggestedVocab: ['మెను', 'ఆర్డర్', 'రుచిగా', 'తినండి', 'నీరు', 'బిల్లు']
	},
	{
		id: 'te-b1-job-discussion',
		title: 'คุยเรื่องงาน',
		description:
			'คุณสนทนาเรื่องงานกับหัวหน้าหรือเพื่อนร่วมงาน อธิบายหน้าที่ เป้าหมาย และความคาดหวังของตนเอง',
		cefrLevel: 'B1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a colleague discussing role expectations in Telugu. Ask the learner to explain responsibilities, priorities, and career plans with B1-level detail.',
		suggestedVocab: ['ఉద్యోగం', 'జీతం', 'బాధ్యతలు', 'అనుభవం', 'సమావేశం', 'నిర్ణయం']
	},
	{
		id: 'te-b1-house-hunting',
		title: 'หาบ้านเช่า',
		description:
			'คุณกำลังมองหาบ้านเช่าและต้องเปรียบเทียบหลายตัวเลือก สนทนาเรื่องราคา ทำเล และเงื่อนไขสัญญา',
		cefrLevel: 'B1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a property agent in Telugu. Hold a B1 conversation about rental options, neighborhood trade-offs, contract terms, and negotiation.',
		suggestedVocab: ['ఇల్లు', 'అద్దె', 'డిపాజిట్', 'పరిసరాలు', 'ఒప్పందం', 'చూడటం']
	},
	{
		id: 'te-b1-travel-story',
		title: 'เล่าเรื่องการเดินทาง',
		description:
			'คุณเล่าประสบการณ์การเดินทางครั้งล่าสุดให้เพื่อนฟัง ใช้รายละเอียด เหตุการณ์ และความรู้สึกให้ครบถ้วน',
		cefrLevel: 'B1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a friend listening to a travel story in Telugu. Prompt the learner to narrate events in sequence, describe impressions, and reflect on highlights at B1 level.',
		suggestedVocab: ['ప్రయాణం', 'జ్ఞాపకం', 'పర్వతాలు', 'స్నేహితులు', 'ఆసక్తికరంగా', 'ఫోటోలు']
	},
	{
		id: 'te-b1-recipe-sharing',
		title: 'แบ่งปันสูตรอาหาร',
		description: 'คุณแชร์สูตรอาหารที่ชอบกับเพื่อน อธิบายส่วนผสม ขั้นตอน และเคล็ดลับการทำให้อร่อย',
		cefrLevel: 'B1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a cooking partner discussing home recipes in Telugu. Encourage the learner to give organized instructions, alternatives, and practical cooking tips at B1 complexity.',
		suggestedVocab: ['వంటకం', 'పదార్థాలు', 'కలపండి', 'మరిగించండి', 'రుచి', 'చిట్కా']
	},
	{
		id: 'te-b1-neighborhood-conflict',
		title: 'แก้ปัญหาความขัดแย้งในชุมชน',
		description:
			'เกิดปัญหาระหว่างเพื่อนบ้านและคุณต้องช่วยพูดคุยหาทางออก เสนอแนวทางที่ยุติธรรมและสุภาพ',
		cefrLevel: 'B1',
		targetLanguage: 'te',
		systemPromptContext:
			'You are a neighbor trying to resolve a local dispute in Telugu. Guide a constructive B1 dialogue focused on explaining concerns, proposing compromises, and agreeing next steps.',
		suggestedVocab: ['పొరుగువారు', 'శబ్దం', 'సమస్య', 'చర్చ', 'ఒప్పందం', 'పరిష్కారం']
	}
];

export function getScenarios(cefrLevel: CefrLevel, targetLanguage: string): Scenario[] {
	return scenarios.filter((s) => s.cefrLevel === cefrLevel && s.targetLanguage === targetLanguage);
}

export function getScenarioById(id: string): Scenario | undefined {
	return scenarios.find((s) => s.id === id);
}
