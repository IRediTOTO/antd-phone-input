import assert from "assert";
import Form from "antd/lib/form";
import Button from "antd/lib/button";
import FormItem from "antd/lib/form/FormItem";
import ConfigProvider from "antd/lib/config-provider";
import userEvent from "@testing-library/user-event";
import {act, render, screen} from "@testing-library/react";

import PhoneInput from "../src";

Object.defineProperty(console, "warn", {
    value: jest.fn(),
})

Object.defineProperty(window, "matchMedia", {
    value: jest.fn().mockImplementation((): any => ({
        addListener: jest.fn(),
        removeListener: jest.fn(),
    })),
})

function inputHasError(parent: any = document) {
    const inputGroup = parent.querySelector(".ant-input-group-wrapper");
    return inputGroup.className.includes("ant-input-group-wrapper-status-error");
}

describe("Checking the basic rendering and functionality", () => {
    it("Rendering without crashing", () => {
        render(<PhoneInput/>);
    })

    it("Rendering with strict raw value", () => {
        render(<PhoneInput value="17021234567"/>);
        assert(screen.getByDisplayValue("+1 (702) 123 4567"));
    })

    it("Rendering with an initial value", () => {
        render(<PhoneInput
            onMount={(value: any) => {
                assert(value.countryCode === 1);
                assert(value.areaCode === "702");
                assert(value.phoneNumber === "1234567");
                assert(value.isoCode === "us");
                assert(value.valid());
            }}
            value={{countryCode: 1, areaCode: "702", phoneNumber: "1234567"}}
        />);
        assert(screen.getByDisplayValue("+1 (702) 123 4567"));
    })

    it("Rendering with a raw initial value", () => {
        render(<Form initialValues={{phone: "17021234567"}}>
            <FormItem name="phone">
                <PhoneInput/>
            </FormItem>
        </Form>);
        assert(screen.getByDisplayValue("+1 (702) 123 4567"));
    })

    it("Checking the component on user input", async () => {
        render(<PhoneInput
            onChange={(value: any) => {
                assert(value.isoCode === "us");
            }}
            country="us"
        />);
        const input = screen.getByDisplayValue("+1");
        await userEvent.type(input, "907123456789");
        assert(input.getAttribute("value") === "+1 (907) 123 4567");
    })

    it("Using the input with FormItem", async () => {
        render(<Form onFinish={({phone}: any) => {
            assert(phone.countryCode === 1);
            assert(phone.areaCode === "907");
            assert(phone.phoneNumber === "1234567");
            assert(phone.isoCode === "us");
        }}>
            <FormItem name="phone">
                <PhoneInput country="us"/>
            </FormItem>
            <Button data-testid="button" htmlType="submit">Submit</Button>
        </Form>);
        const input = screen.getByDisplayValue("+1");
        await userEvent.type(input, "907123456789");
        assert(input.getAttribute("value") === "+1 (907) 123 4567");
        screen.getByTestId("button").click();
    })

    it("Checking input validation with FormItem", async () => {
        render(<Form initialValues={{phone: {countryCode: 1, areaCode: "702", phoneNumber: "1234567"}}}>
            <FormItem name="phone" rules={[{
                validator: (_: any, {valid}: any) => {
                    assert(valid());
                    return Promise.resolve();
                }
            }]}>
                <PhoneInput/>
            </FormItem>
            <Button data-testid="button" htmlType="submit">Submit</Button>
        </Form>);
        await userEvent.click(screen.getByTestId("button"));
    })

    it("Checking form with initial value", async () => {
        render(<Form initialValues={{phone: {countryCode: 1, areaCode: "702"}}}>
            <FormItem name="phone">
                <PhoneInput/>
            </FormItem>
        </Form>);
        const input = screen.getByDisplayValue("+1 (702)");
        await userEvent.type(input, "1234567");
        assert(input.getAttribute("value") === "+1 (702) 123 4567");
    })

    it("Using `prefixCls` with ConfigProvider", () => {
        render(<ConfigProvider prefixCls="custom-prefix">
            <PhoneInput data-testid="input"/>
        </ConfigProvider>);
        const input = screen.getByTestId("input");
        assert(!input.outerHTML.includes("ant-input"));
        assert(input.outerHTML.includes("custom-prefix-input"));
    })

    it("Checking field value setters", async () => {
        const FormWrapper = () => {
            const [form] = Form.useForm();

            const setFieldObjectValue = () => {
                form.setFieldValue("phone", {
                    countryCode: 48,
                    areaCode: "111",
                    phoneNumber: "1111111",
                    isoCode: "pl"
                });
            }

            const setFieldRawValue = () => {
                form.setFieldValue("phone", "+1 (234) 234 2342");
            }

            return (
                <Form data-testid="form" form={form} initialValues={{phone: {countryCode: 1, areaCode: "702"}}}>
                    <FormItem name="phone">
                        <PhoneInput/>
                    </FormItem>
                    <Button data-testid="submit" htmlType="submit">Submit</Button>
                    <Button data-testid="set-string" onClick={setFieldRawValue}>Set String Value</Button>
                    <Button data-testid="set-object" onClick={setFieldObjectValue}>Set Object Value</Button>
                </Form>
            )
        }

        render(<FormWrapper/>);
        const form = screen.getByTestId("form");
        const submit = screen.getByTestId("submit");
        const input = screen.getByDisplayValue("+1 (702)");
        const setString = screen.getByTestId("set-string");
        const setObject = screen.getByTestId("set-object");

        await userEvent.click(setString);
        await userEvent.click(submit);
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(!inputHasError(form)); // valid
        assert(input.getAttribute("value") === "+1 (234) 234 2342");

        await userEvent.click(setObject);
        await userEvent.click(submit);
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(!inputHasError(form)); // valid
        assert(input.getAttribute("value") === "+48 (111) 111 1111");
    })

    it("Checking validation with casual form actions", async () => {
        render(<Form data-testid="form" initialValues={{phone: {countryCode: 1, areaCode: "702", phoneNumber: ""}}}>
            <FormItem name="phone" rules={[{
                validator: (_: any, {valid}: any) => {
                    if (valid()) return Promise.resolve();
                    return Promise.reject("Invalid phone number");
                }
            }]}>
                <PhoneInput/>
            </FormItem>
            <Button data-testid="submit" htmlType="submit">Submit</Button>
            <Button data-testid="reset" htmlType="reset">Reset</Button>
        </Form>);

        const form = screen.getByTestId("form");
        const reset = screen.getByTestId("reset");
        const submit = screen.getByTestId("submit");

        assert(!inputHasError(form)); // valid
        await userEvent.click(reset);
        assert(!inputHasError(form)); // valid
        await userEvent.click(submit);
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(inputHasError(form)); // invalid
        await userEvent.click(reset);
        assert(!inputHasError(form)); // valid
        await userEvent.click(reset);
        assert(!inputHasError(form)); // valid
        await userEvent.click(submit);
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(inputHasError(form)); // invalid
        await userEvent.click(submit);
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(inputHasError(form)); // invalid
    }, 25000)

    it("Checking validation with casual inputs and actions", async () => {
        render(<Form data-testid="form">
            <FormItem name="phone" rules={[{
                validator: (_: any, {valid}: any) => {
                    if (valid()) return Promise.resolve();
                    return Promise.reject("Invalid phone number");
                }
            }]}>
                <PhoneInput country="us"/>
            </FormItem>
            <Button data-testid="submit" htmlType="submit">Submit</Button>
            <Button data-testid="reset" htmlType="reset">Reset</Button>
        </Form>);

        const form = screen.getByTestId("form");
        const reset = screen.getByTestId("reset");
        const submit = screen.getByTestId("submit");
        const input = screen.getByDisplayValue("+1");

        await userEvent.type(input, "90712345");
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(inputHasError(form)); // invalid
        await userEvent.type(input, "6");
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(inputHasError(form)); // invalid
        await userEvent.type(input, "7");
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(!inputHasError(form)); // valid
        await userEvent.click(reset);
        assert(!inputHasError(form)); // valid
        await userEvent.click(submit);
        await act(async () => {
            await new Promise(r => setTimeout(r, 100));
        })
        assert(inputHasError(form)); // invalid
        await userEvent.click(reset);
        assert(!inputHasError(form)); // valid
    }, 25000)
})
