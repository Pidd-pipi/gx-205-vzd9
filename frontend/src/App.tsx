import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, ConfigProvider, Form, Layout, Progress, Radio, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { BookOutlined, ClockCircleOutlined, CrownOutlined, ExperimentOutlined, FlagOutlined, FlagFilled, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/api/client';
import { AbilityRadar } from '@/components/AbilityRadar';
import { useBankStore } from '@/store/useBankStore';
import type { ExamReport, PaperDraft, Question } from '@/types/bank';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

function App() {
  const { dashboard, loading, error, loadDashboard, demoLogin } = useBankStore();
  const [difficulty, setDifficulty] = useState('中级');
  const [amount, setAmount] = useState(10);
  const [paperId, setPaperId] = useState<number | null>(null);
  const [paper, setPaper] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [uncertain, setUncertain] = useState<number[]>([]);
  const [report, setReport] = useState<ExamReport | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const scrolledRef = useRef(false);

  useEffect(() => {
    async function bootstrap() {
      await api.ensureAuth();
      await loadDashboard();
      try {
        const current = await api.currentPaper();
        if (current.paper) {
          applyDraft(current.paper);
          setRestored(true);
        } else {
          await generatePaper();
        }
      } catch {
        // 草稿接口不可用时仍可浏览演示数据
      }
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 答案或不确定标记变化后，防抖自动保存草稿
  useEffect(() => {
    if (!paperId || submitted) {
      return;
    }
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await api.saveDraft(paperId, answers, uncertain);
        setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
      }
    }, 800);
    return () => window.clearTimeout(saveTimer.current);
  }, [answers, uncertain, paperId, submitted]);

  const answeredCount = useMemo(() => paper.filter((question) => answers[question.id]).length, [paper, answers]);
  const firstOpenIndex = useMemo(() => paper.findIndex((question) => !answers[question.id]), [paper, answers]);

  // 恢复草稿后滚动到第一道未完成的题目
  useEffect(() => {
    if (!restored || scrolledRef.current || paper.length === 0) {
      return;
    }
    scrolledRef.current = true;
    const target = firstOpenIndex >= 0 ? paper[firstOpenIndex] : paper[paper.length - 1];
    window.setTimeout(() => {
      document.getElementById(`question-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [restored, paper, firstOpenIndex]);

  function applyDraft(draft: PaperDraft) {
    setPaperId(draft.paper_id);
    setPaper(draft.paper);
    setAnswers(draft.answers);
    setUncertain(draft.uncertain);
    setDifficulty(draft.difficulty);
    setAmount(draft.amount);
    setReport(null);
    setSubmitted(false);
    setSavedAt('');
  }

  async function generatePaper() {
    const draft = await api.generatePaper(difficulty, amount);
    applyDraft(draft);
    setRestored(false);
    scrolledRef.current = false;
  }

  function toggleUncertain(questionId: number) {
    setUncertain((current) =>
      current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId]
    );
  }

  function scrollToFirstOpen() {
    if (firstOpenIndex < 0) {
      return;
    }
    document.getElementById(`question-${paper[firstOpenIndex].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function submitExam() {
    if (!paperId) {
      return;
    }
    window.clearTimeout(saveTimer.current);
    if (!submitted) {
      try {
        await api.saveDraft(paperId, answers, uncertain);
      } catch {
        // 提交时会携带答案，草稿保存失败不影响交卷
      }
    }
    const result = await api.submitExam(paperId, answers);
    setReport(result);
    setSubmitted(true);
  }

  return (
    <ConfigProvider theme={{ token: { borderRadius: 8, colorPrimary: '#2f6b57' } }}>
      <Layout className="page">
        <Content className="shell">
          <section className="hero">
            <div>
              <Text className="eyebrow">GXLogic Bank</Text>
              <Title>逻辑推理题库系统</Title>
              <Paragraph>题型分类、智能组卷、答题解析、错题追踪、模拟考试和段位排名整合在同一个练习台。</Paragraph>
            </div>
            <Space wrap>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDashboard}>刷新</Button>
              <Button type="primary" icon={<CrownOutlined />} onClick={demoLogin}>演示登录</Button>
            </Space>
          </section>

          {error && <Alert type="error" message={error} showIcon className="block" />}

          {dashboard && (
            <>
              <Row gutter={[16, 16]} className="block">
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="累计答题" value={dashboard.profile.totalAnswered} prefix={<BookOutlined />} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="正确率" value={dashboard.profile.correctRate} suffix="%" /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="连续正确天数" value={dashboard.profile.streakDays} prefix={<ClockCircleOutlined />} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="当前段位" value={dashboard.profile.tier} prefix={<CrownOutlined />} /></Card></Col>
              </Row>

              <Row gutter={[16, 16]} className="block">
                <Col xs={24} lg={15}>
                  <Card title="智能组卷练习" extra={<Tag color="green">限时考试可扩展</Tag>}>
                    <Form layout="inline" className="paper-form">
                      <Form.Item label="难度">
                        <Select value={difficulty} onChange={setDifficulty} options={['入门', '初级', '中级', '高级', '专家'].map((value) => ({ value, label: value }))} />
                      </Form.Item>
                      <Form.Item label="题量">
                        <Select value={amount} onChange={setAmount} options={[10, 20, 30, 50].map((value) => ({ value, label: `${value} 题` }))} />
                      </Form.Item>
                      <Button icon={<ExperimentOutlined />} onClick={generatePaper}>生成试卷</Button>
                    </Form>

                    {restored && !submitted && (
                      <Alert
                        type="info"
                        showIcon
                        className="resume-banner"
                        message={`已恢复上次未完成的试卷：已答 ${answeredCount}/${paper.length} 题${firstOpenIndex >= 0 ? `，从第 ${firstOpenIndex + 1} 题继续` : '，已全部作答'}`}
                      />
                    )}

                    {paper.length > 0 && (
                      <div className="paper-progress">
                        <Text type="secondary">已答 {answeredCount}/{paper.length} 题 · 不确定 {uncertain.length} 题</Text>
                        <Progress percent={Math.round((answeredCount / paper.length) * 100)} size="small" />
                        <Space wrap className="paper-progress-side">
                          {firstOpenIndex >= 0 && !submitted && (
                            <Button size="small" icon={<PlayCircleOutlined />} onClick={scrollToFirstOpen}>继续作答</Button>
                          )}
                          {!submitted && savedAt && <Text type="secondary">已自动保存 {savedAt}</Text>}
                          {!submitted && saveFailed && <Text type="danger">保存失败，下次修改时自动重试</Text>}
                        </Space>
                      </div>
                    )}

                    <Space direction="vertical" size={16} className="question-list">
                      {paper.map((question, index) => (
                        <Card
                          key={question.id}
                          size="small"
                          id={`question-${question.id}`}
                          className={`question-card${index === firstOpenIndex && answeredCount > 0 && !submitted ? ' question-card-next' : ''}`}
                        >
                          <Space wrap className="question-meta">
                            <Tag>{question.type}</Tag>
                            <Tag color="blue">{question.difficulty}</Tag>
                            <Tag color="gold">{question.knowledge}</Tag>
                            {uncertain.includes(question.id) && <Tag color="orange">不确定</Tag>}
                            {index === firstOpenIndex && answeredCount > 0 && !submitted && <Tag color="green">继续从这里</Tag>}
                          </Space>
                          <Title level={5}>{index + 1}. {question.stem}</Title>
                          <Radio.Group
                            disabled={submitted}
                            value={answers[question.id]}
                            onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                          >
                            <Space direction="vertical">
                              {question.options.map((option) => <Radio key={option} value={option}>{option}</Radio>)}
                            </Space>
                          </Radio.Group>
                          <div className="question-actions">
                            <Button
                              size="small"
                              type={uncertain.includes(question.id) ? 'primary' : 'default'}
                              ghost={uncertain.includes(question.id)}
                              disabled={submitted}
                              icon={uncertain.includes(question.id) ? <FlagFilled /> : <FlagOutlined />}
                              onClick={() => toggleUncertain(question.id)}
                            >
                              {uncertain.includes(question.id) ? '取消不确定' : '标记不确定'}
                            </Button>
                          </div>
                          <Paragraph className="explain">解析：{question.explanation}</Paragraph>
                        </Card>
                      ))}
                    </Space>
                    <Button type="primary" className="submit" disabled={!paperId} onClick={submitExam}>
                      {submitted ? '已交卷 · 再次查看报告' : '提交并生成报告'}
                    </Button>
                    {report && (
                      <Alert
                        type="success"
                        message={`考试报告：得分 ${report.score}（答对 ${report.correct}/${report.total} 题）`}
                        description={[report.rank_hint, ...report.analysis].join('；')}
                        showIcon
                        className="block"
                      />
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={9}>
                  <Card title="学习进度雷达">
                    <AbilityRadar data={dashboard.radar} />
                  </Card>
                  <Card title="题型分类题库" className="stacked">
                    {dashboard.categories.map((category) => (
                      <div className="category-row" key={category.id}>
                        <Text>{category.name}</Text>
                        <Progress percent={category.accuracy} size="small" />
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="block">
                <Col xs={24} lg={12}>
                  <Card title="错题本与收藏">
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={dashboard.wrongBook}
                      pagination={false}
                      columns={[
                        { title: '题目', dataIndex: 'title' },
                        { title: '类型', dataIndex: 'type', width: 110 },
                        { title: '错误次数', dataIndex: 'mistakes', width: 90 },
                        { title: '最后练习', dataIndex: 'lastPracticed', width: 110 }
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="排行榜与段位">
                    <Table
                      size="small"
                      rowKey="rank"
                      dataSource={dashboard.rankings}
                      pagination={false}
                      columns={[
                        { title: '#', dataIndex: 'rank', width: 54 },
                        { title: '用户', dataIndex: 'name' },
                        { title: '段位', dataIndex: 'tier', width: 90 },
                        { title: '得分', dataIndex: 'score', width: 90 },
                        { title: '正确率', dataIndex: 'accuracy', width: 90, render: (value) => `${value}%` }
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
