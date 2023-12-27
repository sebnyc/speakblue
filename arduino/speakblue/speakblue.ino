int inputPin = 7;
int pirState = LOW;
int val = 0;

void setup()
{
    pinMode(inputPin, INPUT);
    Serial.begin(115200);
}

void loop()
{
    val = digitalRead(inputPin);
    if (val == HIGH)
    {
        if (pirState == LOW)
        {
            Serial.println("ssssssssssssssssssssssss");
            pirState = HIGH;
        }
    }
    else
    {
        if (pirState == HIGH)
        {
            Serial.println("eeeeeeeeeeee");
            pirState = LOW;
        }
    }
    delay(50);
}